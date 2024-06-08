import { isValidObjectId } from "mongoose"
export const validMongoDbId = (id) => {
    const isValid = isValidObjectId(id)
    if (!isValid) throw new Error(' This is not valid or not found.')
}