import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();

vi.mock("./supabase", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  },
}));

// Mock fetch for data URL conversion
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { uploadCover, resolveCoverUrl } from "./covers";

describe("uploadCover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      blob: () => Promise.resolve(new Blob(["data"], { type: "image/jpeg" })),
    });
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://example.com/covers/user1/book1.jpg" },
    });
  });

  it("uploads blob to correct storage path", async () => {
    const url = await uploadCover("data:image/jpeg;base64,abc", "user1", "book1");
    expect(mockUpload).toHaveBeenCalledWith(
      "user1/book1.jpg",
      expect.any(Blob),
      { contentType: "image/jpeg", upsert: true }
    );
    expect(url).toBe("https://example.com/covers/user1/book1.jpg");
  });

  it("throws when upload returns an error", async () => {
    mockUpload.mockResolvedValue({ error: new Error("Storage error") });
    await expect(uploadCover("data:image/jpeg;base64,abc", "user1", "book1")).rejects.toThrow(
      "Storage error"
    );
  });

  it("throws when supabase is null", async () => {
    vi.resetModules();
    vi.doMock("./supabase", () => ({ supabase: null }));
    const { uploadCover: uploadCoverNull } = await import("./covers");
    await expect(uploadCoverNull("data:image/jpeg;base64,abc", "user1", "book1")).rejects.toThrow(
      "Supabase not available"
    );
  });
});

// Regression: base64 cover bloat — cropped covers were stored as raw base64 in IndexedDB
// instead of being uploaded to Supabase Storage and stored as a URL.
describe("resolveCoverUrl", () => {
  const BASE64 = "data:image/jpeg;base64,/9j/fake";
  const PUBLIC_URL = "https://example.com/covers/user1/tmp-id.jpg";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("navigator", { onLine: true });
    mockFetch.mockResolvedValue({
      blob: () => Promise.resolve(new Blob(["data"], { type: "image/jpeg" })),
    });
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: PUBLIC_URL } });
  });

  it("returns a URL (not base64) when online and user is authenticated", async () => {
    const result = await resolveCoverUrl(BASE64, "user1", "tmp-id");
    expect(result).toBe(PUBLIC_URL);
    expect(result).not.toMatch(/^data:/);
  });

  it("returns base64 fallback when offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const result = await resolveCoverUrl(BASE64, "user1", "tmp-id");
    expect(result).toBe(BASE64);
  });

  it("returns base64 fallback when no userId (anonymous user)", async () => {
    const result = await resolveCoverUrl(BASE64, null, "tmp-id");
    expect(result).toBe(BASE64);
  });

  it("returns base64 fallback when upload fails with a network error", async () => {
    mockUpload.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const result = await resolveCoverUrl(BASE64, "user1", "tmp-id");
    expect(result).toBe(BASE64);
  });
});
