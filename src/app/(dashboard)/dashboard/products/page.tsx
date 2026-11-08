'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Rating from '@mui/material/Rating';
import Skeleton from '@mui/material/Skeleton';
import TablePagination from '@mui/material/TablePagination';
import Alert from '@mui/material/Alert';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useProductsStore } from '@/store/productsStore';
import { ErrorMessage } from '@/components/common/ErrorMessage';

export default function ProductsPage() {
  const products = useProductsStore((s) => s.products);
  const categories = useProductsStore((s) => s.categories);
  const total = useProductsStore((s) => s.total);
  const limit = useProductsStore((s) => s.limit);
  const skip = useProductsStore((s) => s.skip);
  const searchQuery = useProductsStore((s) => s.searchQuery);
  const selectedCategory = useProductsStore((s) => s.selectedCategory);
  const isLoading = useProductsStore((s) => s.isLoading);
  const isLoadingCategories = useProductsStore((s) => s.isLoadingCategories);
  const error = useProductsStore((s) => s.listError);
  const categoryError = useProductsStore((s) => s.categoryError);

  const setSearchQuery = useProductsStore((s) => s.setSearchQuery);
  const setSelectedCategory = useProductsStore((s) => s.setSelectedCategory);
  const setPagination = useProductsStore((s) => s.setPagination);
  const fetchProducts = useProductsStore((s) => s.fetchProducts);
  const fetchCategories = useProductsStore((s) => s.fetchCategories);
  const clearError = useProductsStore((s) => s.clearListError);

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [, startTransition] = useTransition();

  // Load categories on initial mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Load products when query, category, limit, or skip changes
  useEffect(() => {
    fetchProducts();
  }, [skip, limit, searchQuery, selectedCategory, fetchProducts]);

  // Debounced search sync
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== searchQuery) {
        startTransition(() => {
          setSearchQuery(localSearch);
        });
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [localSearch, searchQuery, setSearchQuery]);

  const handleClearSearch = () => {
    setLocalSearch('');
    setSearchQuery('');
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedCategory(e.target.value);
  };

  const handleResetFilters = () => {
    setLocalSearch('');
    setSearchQuery('');
    setSelectedCategory('');
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPagination(newPage + 1, limit);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    setPagination(1, newLimit);
  };

  const currentPage = Math.floor(skip / limit);

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'clip' }}>
      {/* Reserve layout space while keeping the toolbar fixed directly below the app navigation. */}
      <Box aria-hidden sx={{ height: { xs: 148, sm: 72, md: 76 }, flex: '0 0 auto' }} />
      <Box
        sx={{
          position: 'fixed',
          top: { xs: 56, sm: 72, md: 76 },
          left: { xs: 8, sm: 20, md: 284 },
          right: { xs: 8, sm: 20, md: 24 },
          width: 'auto',
          zIndex: 1090,
          bgcolor: 'background.default',
          pt: 0.5,
          pb: { xs: 1, sm: 1.5 },
          boxSizing: 'border-box',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
            minWidth: 0,
          }}
        >
          <Typography
            variant="h5"
            component="h1"
            fontWeight={700}
            sx={{
              flex: { xs: '1 1 100%', sm: '0 0 auto' },
              minWidth: 0,
            }}
          >
            Products Catalog
          </Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
              gap: 1,
              minWidth: 0,
              flex: { xs: '1 1 100%', sm: '0 1 auto' },
              ml: { sm: 'auto' },
            }}
          >
            <TextField
              size="small"
              placeholder="Search products..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              sx={{
                width: { xs: '100%', sm: 230, md: 280 },
                flex: { xs: '1 1 100%', sm: '0 1 230px', md: '0 1 280px' },
                minWidth: 0,
                '& .MuiOutlinedInput-root': { height: 40 },
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment>,
                endAdornment: localSearch ? <InputAdornment position="end"><IconButton size="small" onClick={handleClearSearch} edge="end" aria-label="Clear product search"><ClearIcon fontSize="small" /></IconButton></InputAdornment> : null,
              }}
            />

            <TextField
              select
              size="small"
              label="Category"
              value={selectedCategory}
              onChange={handleCategoryChange}
              disabled={isLoadingCategories}
              sx={{
                width: { xs: 'auto', sm: 170, md: 190 },
                flex: { xs: '1 1 130px', sm: '0 1 170px', md: '0 1 190px' },
                minWidth: 0,
                '& .MuiOutlinedInput-root': { height: 40 },
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><FilterListIcon fontSize="small" color="action" /></InputAdornment>,
              }}
            >
              <MenuItem value=""><em>All Categories</em></MenuItem>
              {categories.map((cat) => <MenuItem key={cat.slug} value={cat.slug}>{cat.name}</MenuItem>)}
            </TextField>

            <Button
              variant="outlined"
              size="small"
              onClick={handleResetFilters}
              disabled={!localSearch && !selectedCategory}
              sx={{ minWidth: 64, height: 40, px: 1.25, flex: '0 0 auto' }}
            >
              Reset
            </Button>

            <IconButton
              aria-label="Refresh products"
              onClick={() => fetchProducts(true)}
              disabled={isLoading}
              color="primary"
              sx={{ flex: '0 0 auto', width: 40, height: 40 }}
            >
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Category Error Alert with Retry */}
      {categoryError && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => fetchCategories(true)}
              disabled={isLoadingCategories}
            >
              Retry
            </Button>
          }
        >
          {categoryError}
        </Alert>
      )}

      {/* Error Message with Retry */}
      {error && (
        <ErrorMessage
          title="Error Loading Products"
          message={error}
          onRetry={() => {
            clearError();
            fetchProducts();
          }}
        />
      )}

      {/* Products Grid */}
      {isLoading ? (
        // Skeleton cards
        <Grid container spacing={3} sx={{ width: '100%', minWidth: 0, m: 0 }}>
          {Array.from({ length: limit > 8 ? 8 : limit }).map((_, idx) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={idx}>
              <Card elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Skeleton variant="rectangular" height={180} />
                <CardContent sx={{ p: 2, flexGrow: 1 }}>
                  <Skeleton variant="text" width="60%" height={18} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="90%" height={24} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
                  <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : products.length === 0 ? (
        // Empty State
        <Card elevation={0} sx={{ p: 6, textAlign: 'center' }}>
          <Inventory2OutlinedIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 1.5, opacity: 0.6 }} />
          <Typography variant="h6" fontWeight={600} color="text.primary">
            No products found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3} maxWidth={450} mx="auto">
            {searchQuery || selectedCategory
              ? 'No products match your selected search and category filters. Try adjusting your query or resetting filters.'
              : 'There are currently no products available.'}
          </Typography>
          {(searchQuery || selectedCategory) && (
            <Button variant="contained" size="small" onClick={handleResetFilters}>
              Clear Filters
            </Button>
          )}
        </Card>
      ) : (
        // Products Cards Grid
        <Grid container spacing={3} sx={{ width: '100%', minWidth: 0, m: 0 }}>
          {products.map((product) => {
            const hasDiscount = product.discountPercentage > 0;
            const originalPrice = (product.price / (1 - product.discountPercentage / 100)).toFixed(2);
            const isLowStock = product.stock > 0 && product.stock <= 5;
            const isOutOfStock = product.stock <= 0;

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.18s ease-in-out, box-shadow 0.18s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                    },
                  }}
                >
                  {/* Thumbnail / Image Area */}
                  <Box sx={{ position: 'relative', bgcolor: '#ffffff', p: 2, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CardMedia
                      component="img"
                      image={product.thumbnail || product.images?.[0] || ''}
                      alt={product.title}
                      sx={{
                        maxHeight: '100%',
                        maxWidth: '100%',
                        objectFit: 'contain',
                      }}
                    />
                    {hasDiscount && (
                      <Chip
                        label={`-${Math.round(product.discountPercentage)}%`}
                        color="error"
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          height: 22,
                        }}
                      />
                    )}
                    <Chip
                      label={isOutOfStock ? 'Out of stock' : isLowStock ? 'Low stock' : 'In stock'}
                      color={isOutOfStock ? 'default' : isLowStock ? 'warning' : 'success'}
                      size="small"
                      variant="filled"
                      sx={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        fontSize: '0.675rem',
                        fontWeight: 600,
                        height: 22,
                      }}
                    />
                  </Box>

                  {/* Card Content */}
                  <CardContent sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="baseline" mb={0.5}>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
                        {product.category}
                      </Typography>
                      {product.brand && (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: '50%' }}>
                          {product.brand}
                        </Typography>
                      )}
                    </Box>

                    <Typography variant="subtitle2" fontWeight={700} noWrap title={product.title} sx={{ mb: 1 }}>
                      {product.title}
                    </Typography>

                    {/* Rating */}
                    <Box display="flex" alignItems="center" gap={0.5} mb={1.5}>
                      <Rating value={product.rating} precision={0.1} size="small" readOnly />
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        {product.rating?.toFixed(1)}
                      </Typography>
                    </Box>

                    {/* Price Block */}
                    <Box mt="auto" mb={2} display="flex" alignItems="baseline" gap={1}>
                      <Typography variant="h6" fontWeight={700} color="primary.main">
                        ${product.price?.toFixed(2)}
                      </Typography>
                      {hasDiscount && (
                        <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                          ${originalPrice}
                        </Typography>
                      )}
                    </Box>

                    <Button
                      component={Link}
                      href={`/dashboard/products/${product.id}`}
                      variant="outlined"
                      size="small"
                      fullWidth
                      startIcon={<VisibilityIcon fontSize="small" />}
                      sx={{ borderRadius: 2 }}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Pagination Footer */}
      <Card elevation={0} sx={{ mt: 3 }}>
        <TablePagination
          rowsPerPageOptions={[6, 10, 20]}
          component="div"
          count={total}
          rowsPerPage={limit}
          page={currentPage}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Products per page:"
          disabled={isLoading}
        />
      </Card>
    </Box>
  );
}

