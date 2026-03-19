/* eslint-disable */
export default async () => {
    const t = {
        ["./components/captcha/captcha.dto"]: await import("./components/captcha/captcha.dto"),
        ["./components/ping/ping.dto"]: await import("./components/ping/ping.dto")
    };
    return { "@nestjs/swagger/plugin": { "models": [[import("./components/captcha/captcha.dto"), { "GetProviderListResponse": { isEnabledFor: { required: true, type: () => [String] } }, "GetCaptchaResponse": {} }], [import("./components/ping/ping.dto"), { "PingDtoResponse": { processPid: { required: true, type: () => Number }, message: { required: true, type: () => String } } }]], "controllers": [[import("./components/captcha/captcha.controller"), { "CaptchaController": { "getProviderList": { type: t["./components/captcha/captcha.dto"].GetProviderListResponse }, "getCaptcha": { type: Object } } }], [import("./components/ping/ping.controller"), { "PingController": { "ping": { type: t["./components/ping/ping.dto"].PingDtoResponse } } }], [import("./components/providers/providers.controller"), { "ProvidersController": { "handleProviderRequest": {} } }]] } };
};