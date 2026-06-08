import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class FamiliesService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  async findByParent(parentId: string) {
    const { data, error } = await this.supabase
      .from('families')
      .select('*, children(*)')
      .eq('parent_id', parentId);
    if (error) throw new Error(error.message);
    return data;
  }

  async create(parentId: string, dto: { name: string; city?: string; province?: string }) {
    const { data, error } = await this.supabase
      .from('families')
      .insert({ ...dto, parent_id: parentId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('families')
      .select('*, children(*)')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
}
