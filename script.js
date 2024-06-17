document.addEventListener('DOMContentLoaded', function() {
    let db;
    let cart = [];
    let sales = [];

    // Open (or create) the database
    function openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('StoreBillingDB', 1);
            
            request.onupgradeneeded = function(event) {
                db = event.target.result;
                const objectStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
                objectStore.createIndex('name', 'name', { unique: false });
            };

            request.onsuccess = function(event) {
                db = event.target.result;
                resolve(db);
            };

            request.onerror = function(event) {
                reject('Database error: ' + event.target.errorCode);
            };
        });
    }

    // Add a product to the database
    function addProductToDB(product) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['products'], 'readwrite');
            const objectStore = transaction.objectStore('products');
            const request = objectStore.add(product);
            
            request.onsuccess = function(event) {
                console.log('Product added:', event.target.result);
                resolve(event.target.result);
            };

            request.onerror = function(event) {
                reject('Add error: ' + event.target.errorCode);
            };
        });
    }

    // Get all products from the database
    function getAllProducts() {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['products'], 'readonly');
            const objectStore = transaction.objectStore('products');
            const request = objectStore.getAll();
            
            request.onsuccess = function(event) {
                resolve(event.target.result);
            };

            request.onerror = function(event) {
                reject('Get all error: ' + event.target.errorCode);
            };
        });
    }

    // Render products on the page
    function renderProducts(products) {
        const productSection = document.getElementById('product-list');
        productSection.innerHTML = '';
        products.forEach((product) => {
            const productDiv = document.createElement('div');
            productDiv.classList.add('product');
            productDiv.innerHTML = `
                <img src="${product.image}" alt="${product.name}" width="100" onclick="addToCart(${product.id})">
                <p>${product.name}</p>
                <p>Price: $${product.price}</p>
            `;
            productSection.appendChild(productDiv);
        });
    }

    // Render the cart
    function renderCart() {
        const cartSection = document.getElementById('cart-list');
        cartSection.innerHTML = '';
        cart.forEach((item, index) => {
            const cartItemDiv = document.createElement('div');
            cartItemDiv.classList.add('cart-item');
            cartItemDiv.innerHTML = `
                <img src="${item.image}" alt="${item.name}" width="50">
                <p>${item.name}</p>
                <p>Quantity: ${item.quantity}</p>
                <p>Total: $${(item.price * item.quantity).toFixed(2)}</p>
                <button onclick="removeFromCart(${index})">Remove</button>
            `;
            cartSection.appendChild(cartItemDiv);
        });
    }

    // Render the receipt
    function renderReceipt() {
        const receiptSection = document.getElementById('receipt');
        receiptSection.innerHTML = '';
        let total = 0;
        cart.forEach(item => {
            total += item.price * item.quantity;
            const receiptItem = document.createElement('div');
            receiptItem.innerHTML = `
                <p>${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</p>
            `;
            receiptSection.appendChild(receiptItem);
        });
        const totalDiv = document.createElement('div');
        totalDiv.innerHTML = `<h3>Total: $${total.toFixed(2)}</h3>`;
        receiptSection.appendChild(totalDiv);
    }

    // Add an item to the cart
    window.addToCart = function(id) {
        const transaction = db.transaction(['products'], 'readonly');
        const objectStore = transaction.objectStore('products');
        const request = objectStore.get(id);
        
        request.onsuccess = function(event) {
            const product = event.target.result;
            const cartItem = cart.find(item => item.id === product.id);
            if (cartItem) {
                cartItem.quantity++;
            } else {
                cart.push({ ...product, quantity: 1 });
            }
            renderCart();
        };

        request.onerror = function(event) {
            console.log('Add to cart error: ' + event.target.errorCode);
        };
    }

    // Remove an item from the cart
    window.removeFromCart = function(index) {
        cart.splice(index, 1);
        renderCart();
    }

    // Event listener for adding a new product
    document.getElementById('add-new-product').addEventListener('click', async () => {
        const name = prompt('Enter product name:');
        const price = parseFloat(prompt('Enter product price:'));
        const image = prompt('Enter product image URL:');
        const product = { name, price, image };
        await addProductToDB(product);
        const products = await getAllProducts();
        renderProducts(products);
    });

    // Event listener for generating the receipt
    document.getElementById('generate-receipt').addEventListener('click', () => {
        renderReceipt();
    });

    // Event listener for exporting sales data
    document.getElementById('export-sales').addEventListener('click', () => {
        sales.push(...cart);
        exportToExcel(sales);
        cart = [];
        renderCart();
        alert('Sales data exported to Excel.');
    });

    // Export sales data to Excel
    function exportToExcel(data) {
        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += 'Product Name,Price,Quantity,Total\n';
        data.forEach(item => {
            const row = `${item.name},${item.price},${item.quantity},${item.price * item.quantity}\n`;
            csvContent += row;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'sales_data.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Register the service worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }

    // Open the database and load initial products
    openDatabase().then(async () => {
        const products = await getAllProducts();
        renderProducts(products);
        renderCart();
    });
});
