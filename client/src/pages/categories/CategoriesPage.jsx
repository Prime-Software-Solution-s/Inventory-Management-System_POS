import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../../api/inventory';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { SectionHeader } from '../../components/common/SectionHeader';
import { useAuth } from '../../contexts/AuthContext';

const CategoryFormModal = ({ open, onClose, category, onSubmit, isSubmitting }) => {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: category?.name || '',
        description: category?.description || '',
      });
    }
  }, [open, category, reset]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? 'Edit Category' : 'Create Category'}
      description="Define clean product groupings for better filtering and reporting."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : category ? 'Save Changes' : 'Create Category'}
          </Button>
        </>
      }
    >
      <label className="field">
        <span>Category Name</span>
        <input className="input-shell" {...register('name', { required: true })} />
      </label>

      <label className="field">
        <span>Description</span>
        <textarea className="input-shell textarea-shell" rows="4" {...register('description')} />
      </label>
    </Modal>
  );
};

const CategoriesPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManage = user?.role === 'admin';
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? updateCategory({ id, payload }) : createCategory(payload),
    onSuccess: (_, variables) => {
      toast.success(variables.id ? 'Category updated.' : 'Category created.');
      setFormOpen(false);
      setSelectedCategory(null);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      toast.success('Category deleted.');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const categories = categoriesQuery.data?.items || [];

  return (
    <div className="page-stack viewport-page">
      <SectionHeader
        eyebrow="Classification"
        title="Category Management"
        description="Keep the catalog organized with concise, searchable operational groups."
        action={
          canManage ? (
            <Button
              icon={Plus}
              onClick={() => {
                setSelectedCategory(null);
                setFormOpen(true);
              }}
            >
              Create Category
            </Button>
          ) : null
        }
      />

      <Card className="page-panel">
        <div className="page-panel-scroll">
          {categoriesQuery.isLoading ? (
            <p className="muted-copy">Loading categories...</p>
          ) : categories.length ? (
            <div className="table-wrap">
              <table className="data-table category-data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Description</th>
                    {canManage ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category._id}>
                      <td>
                        <strong>{category.name}</strong>
                      </td>
                      <td>
                        <span className="category-description-cell">
                          {category.description || 'No description added yet.'}
                        </span>
                      </td>
                      {canManage ? (
                        <td>
                          <div className="table-actions category-table-actions">
                            <button
                              className="icon-button"
                              type="button"
                              onClick={() => {
                                setSelectedCategory(category);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="icon-button danger-icon"
                              type="button"
                              onClick={() => deleteMutation.mutate(category._id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={Tags}
              title="No categories yet"
              description="Create the first category so products, filters, and reports stay properly organized."
            />
          )}
        </div>
      </Card>

      <CategoryFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelectedCategory(null);
        }}
        category={selectedCategory}
        onSubmit={(payload) =>
          saveMutation.mutate({
            id: selectedCategory?._id,
            payload,
          })
        }
        isSubmitting={saveMutation.isPending}
      />
    </div>
  );
};

export { CategoriesPage };
