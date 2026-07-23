import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { createMockLogger } from "../../../helpers/createMockLogger.ts";
import { makeNotification, makeMessage, makeMessageWithThresholds } from "../../../helpers/notificationMessage.ts";
import { testNotificationProviderContract } from "../../../helpers/notificationProviderContract.ts";

const mockGotPost = jest.fn().mockResolvedValue({});
jest.unstable_mockModule("got", () => ({ default: { post: mockGotPost } }));

const { JasminSmsProvider } = await import("../../../../src/domain/notifications/providers/jasminSms.ts");

const createProvider = () => {
	const logger = createMockLogger();
	return { provider: new JasminSmsProvider(logger as any), logger };
};

const makeJasminNotification = (overrides?: Record<string, unknown>) =>
	makeNotification({
		type: "jasmin_sms",
		address: "http://jasmin.example.com:8080/secure/sendbatch",
		accessToken: "Basic test-token",
		phone: "260950003956, 260950003935\n260950003152",
		jasminFrom: "260344",
		jasminDlrEnabled: true,
		jasminDlrMethod: "POST",
		jasminDlrUrl: "http://jasmin.example.com:8000/dlr/",
		jasminDlrLevel: 2,
		jasminAccountId: "344-test",
		jasminReportId: "344-test",
		...overrides,
	});

testNotificationProviderContract("JasminSmsProvider", {
	create: () => {
		mockGotPost.mockResolvedValue({});
		return createProvider().provider;
	},
	makeNotification: () => makeJasminNotification(),
});

describe("JasminSmsProvider", () => {
	beforeEach(() => mockGotPost.mockReset().mockResolvedValue({}));

	describe("sendTestAlert", () => {
		it("posts a sendbatch payload and returns true", async () => {
			expect(await createProvider().provider.sendTestAlert(makeJasminNotification())).toBe(true);
			expect(mockGotPost).toHaveBeenCalledWith(
				"http://jasmin.example.com:8080/secure/sendbatch",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: "Basic test-token",
						"Content-Type": "application/json",
					}),
					json: expect.objectContaining({
						globals: expect.objectContaining({
							from: "260344",
							"dlr-method": "POST",
							"dlr-url": "http://jasmin.example.com:8000/dlr/",
							"dlr-level": 2,
						}),
					}),
				})
			);
		});

		it("returns false when address is missing", async () => {
			expect(await createProvider().provider.sendTestAlert(makeJasminNotification({ address: "" }))).toBe(false);
		});

		it("returns false when authorization is missing", async () => {
			expect(await createProvider().provider.sendTestAlert(makeJasminNotification({ accessToken: "" }))).toBe(false);
		});

		it("returns false when recipients are missing", async () => {
			expect(await createProvider().provider.sendTestAlert(makeJasminNotification({ phone: "" }))).toBe(false);
		});

		it("returns false and logs on error", async () => {
			mockGotPost.mockRejectedValue(new Error("fail"));
			const { provider, logger } = createProvider();
			expect(await provider.sendTestAlert(makeJasminNotification())).toBe(false);
			expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ method: "sendTestAlert", details: { error: "fail" } }));
		});
	});

	describe("sendMessage", () => {
		it("sends message content as hex_content to all recipients", async () => {
			const { provider } = createProvider();
			expect(await provider.sendMessage(makeJasminNotification() as any, makeMessage())).toBe(true);
			const payload = mockGotPost.mock.calls[0][1].json;
			expect(payload.messages[0]["account-id"]).toBe("344-test");
			expect(payload.messages[0]["report-id"]).toBe("344-test");
			expect(payload.messages[0].to).toEqual(["260950003956", "260950003935", "260950003152"]);
			expect(payload.messages[0].hex_content).toContain("4D6F6E69746F7220446F776E");
		});

		it("omits DLR fields when DLR is disabled", async () => {
			const { provider } = createProvider();
			await provider.sendMessage(
				makeJasminNotification({
					jasminDlrEnabled: false,
					jasminDlrMethod: undefined,
					jasminDlrUrl: "",
					jasminDlrLevel: undefined,
				}) as any,
				makeMessage()
			);
			const globals = mockGotPost.mock.calls[0][1].json.globals;
			expect(globals["dlr-method"]).toBeUndefined();
			expect(globals["dlr-url"]).toBeUndefined();
			expect(globals["dlr-level"]).toBeUndefined();
		});

		it("returns false when sender is missing", async () => {
			expect(await createProvider().provider.sendMessage(makeJasminNotification({ jasminFrom: "" }) as any, makeMessage())).toBe(false);
		});

		it("omits account ID when it is missing", async () => {
			const { provider } = createProvider();
			await provider.sendMessage(makeJasminNotification({ jasminAccountId: "" }) as any, makeMessage());
			const message = mockGotPost.mock.calls[0][1].json.messages[0];
			expect(message["account-id"]).toBeUndefined();
		});

		it("generates report ID when it is missing", async () => {
			const { provider } = createProvider();
			await provider.sendMessage(makeJasminNotification({ jasminReportId: "" }) as any, makeMessage());
			const message = mockGotPost.mock.calls[0][1].json.messages[0];
			expect(message["report-id"]).toEqual(expect.any(String));
			expect(message["report-id"]).not.toBe("");
		});

		it("returns false and logs on error", async () => {
			mockGotPost.mockRejectedValue(new Error("fail"));
			const { provider, logger } = createProvider();
			expect(await provider.sendMessage(makeJasminNotification() as any, makeMessage())).toBe(false);
			expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ method: "sendMessage", details: { error: "fail" } }));
		});

		it("includes thresholds in text", async () => {
			const { provider } = createProvider();
			await provider.sendMessage(makeJasminNotification() as any, makeMessageWithThresholds());
			const hexContent = mockGotPost.mock.calls[0][1].json.messages[0].hex_content;
			expect(hexContent).toContain("435055");
		});
	});
});
