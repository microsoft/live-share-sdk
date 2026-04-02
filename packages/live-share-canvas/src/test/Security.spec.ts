import "mocha";
import { strict as assert } from "assert";
import { BuiltInLiveCursor, sanitizeUserPictureUrl } from "../core/internals";

class MockElement {
    public readonly children: MockElement[] = [];
    public readonly attributes = new Map<string, string>();
    public readonly style: Record<string, string> = {};
    public textContent = "";

    constructor(public readonly tagName: string) {}

    appendChild<T extends MockElement>(child: T): T {
        this.children.push(child);

        return child;
    }

    setAttribute(name: string, value: string): void {
        this.attributes.set(name, value);
    }
}

class MockDocument {
    createElement(tagName: string): MockElement {
        return new MockElement(tagName);
    }

    createElementNS(_namespace: string, tagName: string): MockElement {
        return new MockElement(tagName);
    }
}

function findElementsByTagName(
    root: MockElement,
    tagName: string
): MockElement[] {
    const matches: MockElement[] = [];

    if (root.tagName === tagName) {
        matches.push(root);
    }

    for (const child of root.children) {
        matches.push(...findElementsByTagName(child, tagName));
    }

    return matches;
}

describe("Security", () => {
    it("rejects URLs with embedded credentials", async () => {
        assert.equal(
            sanitizeUserPictureUrl("https://user:pass@contoso.com/avatar.png"),
            undefined
        );
    });

    it("rejects URLs with username only", async () => {
        assert.equal(
            sanitizeUserPictureUrl("https://user@contoso.com/avatar.png"),
            undefined
        );
    });

    it("sanitizes picture URLs before they are rendered or transmitted", async () => {
        assert.equal(
            sanitizeUserPictureUrl("https://contoso.com/avatar.png"),
            "https://contoso.com/avatar.png"
        );
        assert.equal(
            sanitizeUserPictureUrl("javascript:alert('xss')"),
            undefined
        );
        assert.equal(
            sanitizeUserPictureUrl(
                // eslint-disable-next-line no-useless-escape
                'https://contoso.com/avatar.png\" onerror=\"alert(1)'
            ),
            undefined
        );
        assert.equal(sanitizeUserPictureUrl("not a url"), undefined);
    });

    it("renders built-in cursors without using HTML parsing", async () => {
        const originalDocument = globalThis.document;
        const mockDocument = new MockDocument() as unknown as Document;

        (globalThis as typeof globalThis & { document: Document }).document =
            mockDocument;

        try {
            const cursor = new BuiltInLiveCursor("client-id", {
                displayName: '<img src=x onerror=alert("xss")>',
                pictureUri: "https://contoso.com/avatar.png",
            });

            const renderedElement =
                cursor.renderedElement as unknown as MockElement;
            const imageElements = findElementsByTagName(renderedElement, "img");
            const pathElements = findElementsByTagName(renderedElement, "path");
            const nameElement = findElementsByTagName(
                renderedElement,
                "div"
            ).find(
                (element) =>
                    element.textContent === '<img src=x onerror=alert("xss")>'
            );

            assert.equal(imageElements.length, 1);
            assert.equal(
                imageElements[0].attributes.get("src"),
                "https://contoso.com/avatar.png"
            );
            assert.equal(imageElements[0].attributes.get("alt"), "");
            assert.equal(
                imageElements[0].attributes.get("aria-hidden"),
                "true"
            );
            assert.equal(pathElements.length, 2);
            assert.ok(nameElement);
        } finally {
            if (originalDocument) {
                (
                    globalThis as typeof globalThis & { document: Document }
                ).document = originalDocument;
            } else {
                delete (globalThis as Partial<typeof globalThis>).document;
            }
        }
    });
});
