import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  async findAll() { return []; }
  async findOne(id: string) { return null; }
  async create(data: any) { return null; }
  async update(id: string, data: any) { return null; }
  async remove(id: string) { return { success: true }; }
}
