export default {
    ignore: {
        // Vendored lint tooling: excluded from oxlint/oxfmt via ignorePatterns
        // and from React Doctor scanning (the anti-slop plugin self-lints its
        // own source otherwise).
        files: ["tools/**"],
    },
};
