'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Rating from '@mui/material/Rating';
import Avatar from '@mui/material/Avatar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import StraightenOutlinedIcon from '@mui/icons-material/StraightenOutlined';
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined';
import { useProductsStore } from '@/store/productsStore';
import { ProductCarousel } from '@/components/products/ProductCarousel';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';

export default function ProductDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const selectedProduct = useProductsStore((s) => s.selectedProduct);
  const isLoading = useProductsStore((s) => s.isLoadingDetail);
  const error = useProductsStore((s) => s.error);
  const fetchProductById = useProductsStore((s) => s.fetchProductById);
  const clearSelectedProduct = useProductsStore((s) => s.clearSelectedProduct);

  useEffect(() => {
    if (id) {
      fetchProductById(id);
    }
    return () => {
      clearSelectedProduct();
    };
  }, [id, fetchProductById, clearSelectedProduct]);

  if (isLoading) {
    return <Loading message="Loading product information..." fullHeight />;
  }

  if (error || !selectedProduct) {
    return (
      <Box py={4}>
        <Button
          component={Link}
          href="/dashboard/products"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 3 }}
        >
          Back to Products
        </Button>
        <ErrorMessage
          title="Product Not Found"
          message={error || `Unable to load details for product #${id}.`}
          onRetry={() => fetchProductById(id)}
        />
      </Box>
    );
  }

  const hasDiscount = selectedProduct.discountPercentage > 0;
  const originalPrice = (
    selectedProduct.price /
    (1 - selectedProduct.discountPercentage / 100)
  ).toFixed(2);
  const isOutOfStock = selectedProduct.stock <= 0;
  const isLowStock = selectedProduct.stock > 0 && selectedProduct.stock <= 5;

  return (
    <Box>
      {/* Back Button */}
      <Box mb={3}>
        <Button
          component={Link}
          href="/dashboard/products"
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
          sx={{ borderRadius: 2 }}
        >
          Back to Products
        </Button>
      </Box>

      {/* Main Product Presentation Grid */}
      <Grid container spacing={4} mb={4}>
        {/* Left Column: Image Carousel */}
        <Grid item xs={12} md={6}>
          <ProductCarousel
            images={selectedProduct.images?.length ? selectedProduct.images : [selectedProduct.thumbnail]}
            title={selectedProduct.title}
          />
        </Grid>

        {/* Right Column: Key Details & Purchasing Info */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              {/* Category & Brand Header */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={1}>
                <Chip
                  label={selectedProduct.category?.toUpperCase()}
                  size="small"
                  color="primary"
                  sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                />
                {selectedProduct.brand && (
                  <Typography variant="subtitle2" color="text.secondary">
                    Brand: <strong>{selectedProduct.brand}</strong>
                  </Typography>
                )}
              </Box>

              {/* Product Title */}
              <Typography variant="h5" component="h1" fontWeight={700} gutterBottom>
                {selectedProduct.title}
              </Typography>

              {/* Rating & SKU */}
              <Box display="flex" alignItems="center" gap={1.5} mb={2} flexWrap="wrap">
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Rating value={selectedProduct.rating} precision={0.1} size="small" readOnly />
                  <Typography variant="body2" fontWeight={600}>
                    {selectedProduct.rating?.toFixed(1)}
                  </Typography>
                </Box>
                {selectedProduct.reviews && (
                  <Typography variant="caption" color="text.secondary">
                    ({selectedProduct.reviews.length} customer reviews)
                  </Typography>
                )}
                {selectedProduct.sku && (
                  <Typography variant="caption" color="text.secondary">
                    &bull; SKU: {selectedProduct.sku}
                  </Typography>
                )}
              </Box>

              {/* Price & Discount Display */}
              <Box display="flex" alignItems="baseline" gap={2} my={2.5} p={2} bgcolor="action.hover" borderRadius={2}>
                <Typography variant="h4" fontWeight={800} color="primary.main">
                  ${selectedProduct.price?.toFixed(2)}
                </Typography>
                {hasDiscount && (
                  <>
                    <Typography variant="body1" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                      ${originalPrice}
                    </Typography>
                    <Chip
                      label={`Save ${Math.round(selectedProduct.discountPercentage)}%`}
                      color="error"
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  </>
                )}
              </Box>

              {/* Inventory & Stock Status */}
              <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                <Inventory2OutlinedIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  Inventory: <strong>{selectedProduct.stock} units</strong>
                </Typography>
                <Chip
                  label={isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Available'}
                  color={isOutOfStock ? 'default' : isLowStock ? 'warning' : 'success'}
                  size="small"
                  sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                />
              </Box>

              {/* Description */}
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                Description
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph lineHeight={1.6}>
                {selectedProduct.description}
              </Typography>

              <Divider sx={{ my: 2 }} />

              {/* Quick Policy Highlights */}
              <Grid container spacing={1.5}>
                {selectedProduct.shippingInformation && (
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LocalShippingOutlinedIcon fontSize="small" color="primary" />
                      <Typography variant="caption" color="text.secondary">
                        {selectedProduct.shippingInformation}
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {selectedProduct.returnPolicy && (
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <AssignmentReturnOutlinedIcon fontSize="small" color="primary" />
                      <Typography variant="caption" color="text.secondary">
                        {selectedProduct.returnPolicy}
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {selectedProduct.warrantyInformation && (
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <VerifiedUserOutlinedIcon fontSize="small" color="primary" />
                      <Typography variant="caption" color="text.secondary">
                        {selectedProduct.warrantyInformation}
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Specifications & Reviews Section */}
      <Grid container spacing={3}>
        {/* Product Specifications Card */}
        <Grid item xs={12} md={5}>
          <Card elevation={0} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Product Specifications
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box display="flex" flexDirection="column" gap={1.5}>
                {selectedProduct.dimensions && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <StraightenOutlinedIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">Dimensions (W × H × D)</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={500}>
                      {selectedProduct.dimensions.width} × {selectedProduct.dimensions.height} × {selectedProduct.dimensions.depth} cm
                    </Typography>
                  </Box>
                )}
                {selectedProduct.weight && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <FitnessCenterOutlinedIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">Weight</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={500}>
                      {selectedProduct.weight} kg
                    </Typography>
                  </Box>
                )}
                {selectedProduct.minimumOrderQuantity && (
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Minimum Order Quantity</Typography>
                    <Typography variant="body2" fontWeight={500}>{selectedProduct.minimumOrderQuantity} units</Typography>
                  </Box>
                )}
                {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                  <Box mt={1}>
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                      TAGS
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {selectedProduct.tags.map((tag) => (
                        <Chip key={tag} label={`#${tag}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Customer Reviews Card */}
        <Grid item xs={12} md={7}>
          <Card elevation={0} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Customer Reviews
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {!selectedProduct.reviews || selectedProduct.reviews.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No customer reviews available for this product yet.
                </Typography>
              ) : (
                <List disablePadding>
                  {selectedProduct.reviews.map((rev, index) => (
                    <ListItem
                      key={index}
                      disableGutters
                      sx={{
                        pb: 2,
                        mb: index < selectedProduct.reviews!.length - 1 ? 2 : 0,
                        borderBottom: index < selectedProduct.reviews!.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Avatar sx={{ width: 36, height: 36, mr: 2, bgcolor: 'secondary.light', fontSize: '0.875rem' }}>
                        {rev.reviewerName?.charAt(0) || 'R'}
                      </Avatar>
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" fontWeight={600}>
                              {rev.reviewerName}
                            </Typography>
                            <Rating value={rev.rating} size="small" readOnly />
                          </Box>
                        }
                        secondary={
                          <Box mt={0.5}>
                            <Typography variant="body2" color="text.primary">
                              {rev.comment}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {rev.date ? new Date(rev.date).toLocaleDateString() : ''}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

