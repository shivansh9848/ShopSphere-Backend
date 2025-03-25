const fetchBrands = async () => {
    try {
        const response = await fetch('https://dummyjson.com/products?limit=0'); // Replace with actual API URL
        const data = await response.json();

        // Extract unique brands, filtering out undefined/null values
        const brands = [...new Set(data.products.map(product => product.brand).filter(Boolean))];

        // Format brands to match schema
        const formattedBrands = brands.map(brand => ({
            label: brand.charAt(0).toUpperCase() + brand.slice(1), // Capitalize first letter
            value: brand.toLowerCase()
        }));

        console.log(formattedBrands);
    } catch (error) {
        console.error('Error fetching brands:', error);
    }
};

fetchBrands();
