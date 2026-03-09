"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientIp = getClientIp;
exports.getClientUserAgent = getClientUserAgent;
/** IP do cliente (considera proxy Render: x-forwarded-for). */
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        const first = forwarded.split(',')[0]?.trim();
        if (first)
            return first;
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
}
/** User-Agent do cliente. */
function getClientUserAgent(req) {
    const ua = req.headers['user-agent'];
    return typeof ua === 'string' ? ua : null;
}
