function createRateLimiter({ windowMs, maxRequests }) {
    const requestLog = new Map();

    return function isRateLimited(key) {
        const now = Date.now();
        const windowStart = now - windowMs;
        const recentRequests = (requestLog.get(key) || []).filter((timestamp) => timestamp > windowStart);

        if (recentRequests.length === 0) {
            requestLog.delete(key);
        }

        if (recentRequests.length >= maxRequests) {
            requestLog.set(key, recentRequests);
            return true;
        }

        recentRequests.push(now);
        requestLog.set(key, recentRequests);
        return false;
    };
}

module.exports = {
    createRateLimiter,
};
