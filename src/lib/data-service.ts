import { supabase } from './supabase-client';

export type Contractor = {
  id: string;
  name: string;
  trade: string;
  rating: number;
  reviews_count: number;
  status: string;
  phone: string;
};

export async function fetchContractors(): Promise<Contractor[]> {
  const { data, error } = await supabase
    .from('pl_contractors')
    .select(`
      id,
      profiles(full_name),
      trade,
      rating,
      reviews_count,
      status,
      phone
    `);

  if (error) {
    console.error('Error fetching contractors:', error);
    return [];
  }

  return data.map((item: any) => ({
    id: item.id,
    name: item.profiles?.full_name || 'Unknown',
    trade: item.trade,
    rating: Number(item.rating),
    reviews_count: item.reviews_count,
    status: item.status,
    phone: item.phone,
  }));
}

export async function updateContractorStatus(id: string, status: string) {
  const { error } = await supabase
    .from('pl_contractors')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
}
