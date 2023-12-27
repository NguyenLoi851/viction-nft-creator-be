import { Request } from 'express';
import { Admin } from '../../database/entities';

interface RequestWithUser extends Request {
    user: Admin;
}

export default RequestWithUser;