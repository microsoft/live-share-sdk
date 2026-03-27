import "mocha";
import { strict as assert } from "assert";
import { sanitizeUserPictureUrl } from "../core/internals";

describe("Security", () => {
    it("allows valid https picture URLs", async () => {
        assert.equal(
            sanitizeUserPictureUrl("https://contoso.com/avatar.png"),
            "https://contoso.com/avatar.png"
        );
    });

    it("allows valid http picture URLs", async () => {
        assert.equal(
            sanitizeUserPictureUrl("http://contoso.com/avatar.png"),
            "http://contoso.com/avatar.png"
        );
    });

    it("rejects javascript: scheme", async () => {
        assert.equal(
            sanitizeUserPictureUrl("javascript:alert('xss')"),
            undefined
        );
    });

    it("rejects data: scheme", async () => {
        assert.equal(
            sanitizeUserPictureUrl("data:text/html,<script>alert(1)</script>"),
            undefined
        );
    });

    it("rejects URLs with HTML metacharacters", async () => {
        assert.equal(
            sanitizeUserPictureUrl(
                'https://contoso.com/avatar.png" onerror="alert(1)'
            ),
            undefined
        );
    });

    it("rejects non-URL strings", async () => {
        assert.equal(sanitizeUserPictureUrl("not a url"), undefined);
    });

    it("returns undefined for empty or missing values", async () => {
        assert.equal(sanitizeUserPictureUrl(undefined), undefined);
        assert.equal(sanitizeUserPictureUrl(""), undefined);
        assert.equal(sanitizeUserPictureUrl("   "), undefined);
    });
});
