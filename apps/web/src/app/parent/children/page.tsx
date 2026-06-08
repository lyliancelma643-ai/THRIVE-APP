'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useFamily, useChildren } from '@thrive/shared';

export default function ParentChildrenPage() {
  const { user } = useAuthStore();
  const { family } = useFamily(user?.id);
  const { children, isLoading, createChild } = useChildren(family?.id);

  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: user?.lastName || '',
    date_of_birth: '',
    gender: 'M',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createChild(formData);
      setIsAdding(false);
      setFormData({ ...formData, first_name: '', date_of_birth: '' });
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'ajout de l\'enfant');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="bg-brand-tertiary/10 border border-brand-tertiary/30 rounded-xl p-8 mb-8 text-center flex flex-col items-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Famille {family?.name || 'Inconnue'}</h2>
        <p className="text-white/70 text-base">Gérez les profils de vos enfants</p>
      </div>
      {!isAdding && (
        <div className="flex justify-end mb-10">
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-white text-brand-primary px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-gray-50 transition-colors"
          >
            + Ajouter un enfant
          </button>
        </div>
      )}

      {isAdding && (
        <div className="bg-white rounded-xl p-6 mb-8 shadow-sm">
          <h2 className="text-lg font-bold text-brand-primary mb-4">Nouveau Profil</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input 
                  type="text" required
                  value={formData.first_name}
                  onChange={e => setFormData({...formData, first_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de famille</label>
                <input 
                  type="text" required
                  value={formData.last_name}
                  onChange={e => setFormData({...formData, last_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                <input 
                  type="date" required
                  value={formData.date_of_birth}
                  onChange={e => setFormData({...formData, date_of_birth: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
                <select 
                  value={formData.gender}
                  onChange={e => setFormData({...formData, gender: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-gray-900"
                >
                  <option value="M">Garçon</option>
                  <option value="F">Fille</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-brand-primary text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-brand-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : children.length === 0 ? (
        <div className="bg-white/10 rounded-xl p-8 text-center border border-white/20">
          <p className="text-white/80 text-sm">Aucun enfant n'est enregistré pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map((child) => (
            <div key={child.id} className="bg-white rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-brand-tertiary/20 p-6 flex flex-col items-center border-b border-gray-100">
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-brand-primary font-bold text-2xl shadow-sm mb-4 border-2 border-brand-primary/10">
                  {child.first_name?.[0] || ''}{child.last_name?.[0] || ''}
                </div>
                <h3 className="font-bold text-gray-900 text-xl text-center">{child.first_name} {child.last_name}</h3>
                <p className="text-sm text-gray-500">{new Date().getFullYear() - new Date(child.date_of_birth).getFullYear()} ans</p>
              </div>
              <div className="p-4 bg-gray-50 flex-1 flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Badges obtenus</span>
                  <span className="font-bold text-brand-primary">{child.child_badges?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Statut</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
                    Actif
                  </span>
                </div>
              </div>
              <div className="p-3 bg-white border-t border-gray-100">
                <button className="w-full py-2 text-brand-primary hover:bg-brand-tertiary/10 rounded-lg text-sm font-bold transition-colors">
                  Voir le profil détaillé
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
