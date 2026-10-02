import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { createMockLogger } from "../../../helpers/createMockLogger.ts";
import { makeNotification, makeMessage, makeMessageWithThresholds } from "../../../helpers/notificationMessage.ts";
import { testNotificationProviderContract } from "../../../helpers/notificationProviderContract.ts";

const mockGotPost = jest.fn().mockResolvedValue({});
jest.unstable_mockModule("got", () => ({ default: { post: mockGotPost } }));

const { KamexProvider } = await import("../../../../src/domain/notifications/providers/kamex.ts");

const createProvider = () => {
	const logger = createMockLogger();
	return { provider: new KamexProvider(logger as any), logger };
};

const makeKamexNotification = (overrides?: Record<string, unknown>) =>
	makeNotification({
		type: "kamex",
		phone: "260950003956, 260950003935\n260950003152",
		kamexHost: "10.3.104.149",
		kamexPort: 13013,
		kamexPath: "/cgi-bin/sendsms",
		kamexApiKey: "test-api-key",
		kamexCoding: 2,
		kamexCharset: "UTF-8",
		kamexFrom: "260344",
		kamexDlrMask: 31,
		kamexDlrUrl: "http://10.3.104.200:3900?dlr=%d&status=%A",
		...overrides,
	});

testNotificationProviderContract("KamexProvider", {
	create: () => {
		mockGotPost.mockResolvedValue({});
		return createProvider().provider;
	},
	makeNotification: () => makeKamexNotification(),
});

describe("KamexProvider", () => {
	beforeEach(() => mockGotPost.mockReset().mockResolvedValue({}));

	describe("sendTestAlert", () => {
		it("posts one sendsms payload per recipient and returns true", async () => {
			expect(await createProvider().provider.sendTestAlert(makeKamexNotification())).toBe(true);

			expect(mockGotPost).toHaveBeenCalledTimes(3);
			expect(mockGotPost).toHaveBeenNthCalledWith(
				1,
				"http://10.3.104.149:13013/cgi-bin/sendsms",
				expect.objectContaining({
					headers: expect.objectContaining({
						"x-api-key": "test-api-key",
						"Content-Type": "application/json",
					}),
					json: expect.objectContaining({
						to: "260950003956",
						coding: 2,
						charset: "UTF-8",
						from: "260344",
						"dlr-mask": 31,
						"dlr-url": "http://10.3.104.200:3900?dlr=%d&status=%A",
					}),
				})
			);
			expect(mockGotPost.mock.calls.map((call) => call[1].json.to)).toEqual(["260950003956", "260950003935", "260950003152"]);
		});

		it("returns false when the API key is missing", async () => {
			expect(await createProvider().provider.sendTestAlert(makeKamexNotification({ kamexApiKey: "" }))).toBe(false);
		});

		it("returns false when recipients are missing", async () => {
			expect(await createProvider().provider.sendTestAlert(makeKamexNotification({ phone: "" }))).toBe(false);
		});

		it("returns false and logs on error", async () => {
			mockGotPost.mockRejectedValue(new Error("fail"));
			const { provider, logger } = createProvider();
			expect(await provider.sendTestAlert(makeKamexNotification())).toBe(false);
			expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ method: "sendTestAlert", details: { error: "fail" } }));
		});
	});

	describe("sendMessage", () => {
		it("sends message text to each recipient", async () => {
			const { provider } = createProvider();
			expect(await provider.sendMessage(makeKamexNotification() as any, makeMessage())).toBe(true);

			expect(mockGotPost).toHaveBeenCalledTimes(3);
			const payload = mockGotPost.mock.calls[0][1].json;
			expect(payload.text).toContain("Monitor Down");
			expect(payload.to).toBe("260950003956");
		});

		it("omits optional DLR fields when they are missing", async () => {
			const { provider } = createProvider();
			await provider.sendMessage(
				makeKamexNotification({
					kamexDlrMask: undefined,
					kamexDlrUrl: "",
				}) as any,
				makeMessage()
			);

			const payload = mockGotPost.mock.calls[0][1].json;
			expect(payload["dlr-mask"]).toBeUndefined();
			expect(payload["dlr-url"]).toBeUndefined();
		});

		it("accepts a host that already includes a scheme", async () => {
			const { provider } = createProvider();
			await provider.sendMessage(makeKamexNotification({ kamexHost: "http://10.3.104.149", kamexPath: "cgi-bin/sendsms" }) as any, makeMessage());

			expect(mockGotPost.mock.calls[0][0]).toBe("http://10.3.104.149:13013/cgi-bin/sendsms");
		});

		it("returns false when sender is missing", async () => {
			expect(await createProvider().provider.sendMessage(makeKamexNotification({ kamexFrom: "" }) as any, makeMessage())).toBe(false);
		});

		it("returns false and logs on error", async () => {
			mockGotPost.mockRejectedValue(new Error("fail"));
			const { provider, logger } = createProvider();
			expect(await provider.sendMessage(makeKamexNotification() as any, makeMessage())).toBe(false);
			expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ method: "sendMessage", details: { error: "fail" } }));
		});

		it("includes thresholds in text", async () => {
			const { provider } = createProvider();
			await provider.sendMessage(makeKamexNotification() as any, makeMessageWithThresholds());
			const text = mockGotPost.mock.calls[0][1].json.text;
			expect(text).toContain("CPU");
		});
	});
});
