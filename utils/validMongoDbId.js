import { Types } from "mongoose"
export const validMongoDbId = (id) => {
    const isValid = Types.ObjectId.isValid(id)
    if (!isValid) throw new Error(' This is not valid or not found.')
}