const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true
    },
    subCategory: {
        type: String
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    stock: {
        type: Number,
        required: true,
        min: 0
    },
    sold: {
        type: Number,
        default: 0
    },
    images: [{
        type: String
    }],
    description: {
        type: String,
        trim: true
    },
    tags: [{
        type: String
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for revenue
productSchema.virtual('revenue').get(function() {
    return this.sold * this.price;
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;