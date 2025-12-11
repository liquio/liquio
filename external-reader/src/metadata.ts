/* eslint-disable */
export default async () => {
    const t = {
        ["./components/ping/ping.dto"]: await import("./components/ping/ping.dto"),
        ["./components/captcha/captcha.dto"]: await import("./components/captcha/captcha.dto")
    };
    return { "@nestjs/swagger/plugin": { "models": [[import("./components/ping/ping.dto"), { "PingDtoResponse": { processPid: { required: true, type: () => Number }, message: { required: true, type: () => String } } }], [import("./components/captcha/captcha.dto"), { "GetProviderListResponse": { isEnabledFor: { required: true, type: () => [String] } }, "GetCaptchaResponse": {} }]], "controllers": [[import("./components/ping/ping.controller"), { "PingController": { "ping": { type: t["./components/ping/ping.dto"].PingDtoResponse } } }], [import("./components/captcha/captcha.controller"), { "CaptchaController": { "getProviderList": { type: t["./components/captcha/captcha.dto"].GetProviderListResponse }, "getCaptcha": { type: Object } } }], [import("./components/providers/providers.controller"), { "ProvidersController": { "handleProviderRequest": {} } }]] } };
};