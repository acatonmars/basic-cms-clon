const express = require('express');
const router = express.Router();
const multer = require('multer');
const Product = require('../models/product');

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});
const upload = multer({ storage: storage });

// Get all products with filtering and pagination
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Build filter object
        const filter = {};
        if (req.query.category) filter.category = req.query.category;
        if (req.query.priceMin || req.query.priceMax) {
            filter.price = {};
            if (req.query.priceMin) filter.price.$gte = parseFloat(req.query.priceMin);
            if (req.query.priceMax) filter.price.$lte = parseFloat(req.query.priceMax);
        }
        if (req.query.search) {
            filter.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        // Get products
        const products = await Product.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const total = await Product.countDocuments(filter);

        // Get unique categories for filter dropdown
        const categories = await Product.distinct('category');

        res.render('products/index', {
            products,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total,
            limit,
            categories,
            filters: req.query
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Get add product form
router.get('/add', (req, res) => {
    res.render('products/add');
});

// Add new product
router.post('/', upload.array('images', 5), async (req, res) => {
    try {
        const productData = {
            ...req.body,
            images: req.files ? req.files.map(file => file.filename) : [],
            tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : []
        };

        const product = new Product(productData);
        await product.save();

        res.redirect('/products');
    } catch (err) {
        res.status(400).render('products/add', {
            error: 'Error adding product',
            product: req.body
        });
    }
});

// Get edit product form
router.get('/:id/edit', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).send('Product not found');
        }
        res.render('products/edit', { product });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Update product
router.put('/:id', upload.array('images', 5), async (req, res) => {
    try {
        let product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Manejar imágenes existentes
        let updatedImages = [];
        if (req.body.existingImages) {
            // Si solo hay una imagen existente, convertirla en array
            const existingImages = Array.isArray(req.body.existingImages) 
                ? req.body.existingImages 
                : [req.body.existingImages];
            updatedImages = existingImages;
        }

        // Manejar eliminación de imágenes
        if (req.body.imagesToRemove) {
            const imagesToRemove = Array.isArray(req.body.imagesToRemove)
                ? req.body.imagesToRemove
                : [req.body.imagesToRemove];
            
            updatedImages = updatedImages.filter(img => !imagesToRemove.includes(img));
        }

        // Agregar nuevas imágenes
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => file.filename);
            updatedImages = [...updatedImages, ...newImages];
        }

        // Actualizar el producto
        product.images = updatedImages;
        product.name = req.body.name;
        product.category = req.body.category;
        product.subCategory = req.body.subCategory;
        product.price = req.body.price;
        product.stock = req.body.stock;
        product.description = req.body.description;
        product.tags = req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [];

        await product.save();
        res.redirect('/products');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating product');
    }
});

module.exports = router;