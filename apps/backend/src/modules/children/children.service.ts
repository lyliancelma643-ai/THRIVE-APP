import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class ChildrenService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  async findByFamily(familyId: string) {
    const { data, error } = await this.supabase
      .from('children')
      .select('*')
      .eq('family_id', familyId)
      .eq('is_active', true);
    if (error) throw new Error(error.message);
    return data;
  }

  async create(dto: {
    family_id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender?: string;
  }) {
    const { data, error } = await this.supabase
      .from('children')
      .insert(dto)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('children')
      .select('*, child_badges(*, badges(*))')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
}
