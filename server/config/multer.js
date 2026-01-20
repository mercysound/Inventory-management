import multer from "multer";

// export const upload = multer({storage: multer.diskStorage({})});
const storage = multer.diskStorage({});
export const upload = multer({storage});