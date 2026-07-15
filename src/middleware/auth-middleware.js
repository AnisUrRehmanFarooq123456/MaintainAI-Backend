import jwt from "jsonwebtoken";

const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).send({ status: false, message: "Authorization token is required" });
        }
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        console.error("verifyToken failed:", error.name, error.message); // ADD THIS
        return res.status(401).send({ status: false, message: "Invalid or expired token" });
    }
};

const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).send({ status: false, message: "You are not authorized to perform this action" });
        }
        next();
    };
};

// Does NOT block the request if there's no token — just attaches req.user if a valid one is present.
// Used on public routes that behave differently for a logged-in reporter vs a fully anonymous visitor.
const attachUserIfPresent = (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_KEY);
            req.user = decoded;
        }
    } catch (error) {
        // invalid/expired token on a public route — just proceed as anonymous
    }
    next();
};

export { verifyToken, requireRole, attachUserIfPresent };