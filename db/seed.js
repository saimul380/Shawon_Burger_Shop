const { pool } = require('./config');

const menuItems = [
    // Burgers
    { name: 'Classic Burger', price: 299, category: 'Burgers', description: 'A timeless classic with a juicy beef patty, fresh lettuce, tomato, and our special sauce.', image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500' },
    { name: 'Veggie Burger', price: 199, category: 'Burgers', description: 'A delicious and hearty veggie patty with all the classic fixings.', image_url: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500' },
    { name: 'Double Cheese Burger', price: 349, category: 'Burgers', description: 'Twice the beef, twice the cheese, twice the flavor!', image_url: 'https://images.unsplash.com/photo-1607013251379-e6eecfffe234?w=500' },
    { name: 'Spicy Jalapeño Burger', price: 329, category: 'Burgers', description: 'For those who like it hot, with spicy jalapeños and pepper jack cheese.', image_url: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=500' },
    { name: 'Mushroom Swiss Burger', price: 359, category: 'Burgers', description: 'Sautéed mushrooms and melted Swiss cheese on a juicy beef patty.', image_url: 'https://images.unsplash.com/photo-1608767221051-2b9d18f35a2f?w=500' },
    { name: 'BBQ Bacon Burger', price: 379, category: 'Burgers', description: 'Smoky BBQ sauce, crispy bacon, and an onion ring on top.', image_url: 'https://images.unsplash.com/photo-1550950158-d09217a1f11b?w=500' },

    // Pizzas
    { name: 'Margherita Pizza', price: 599, category: 'Pizzas', description: 'Classic Margherita with fresh mozzarella, tomatoes, and basil.', image_url: 'https://images.unsplash.com/photo-1598021680942-84934336c47a?w=500' },
    { name: 'Pepperoni Pizza', price: 699, category: 'Pizzas', description: 'A crowd favorite, loaded with pepperoni and mozzarella cheese.', image_url: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=500' },
    { name: 'BBQ Chicken Pizza', price: 749, category: 'Pizzas', description: 'Tangy BBQ sauce, grilled chicken, red onions, and cilantro.', image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500' },
    { name: 'Veggie Supreme Pizza', price: 649, category: 'Pizzas', description: 'Loaded with all your favorite veggies for a healthy and tasty option.', image_url: 'https://images.unsplash.com/photo-1571066811602-716837d681de?w=500' },
    { name: 'Meat Lovers Pizza', price: 799, category: 'Pizzas', description: 'For the carnivore in you, packed with pepperoni, sausage, and bacon.', image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500' },
    { name: 'Hawaiian Pizza', price: 679, category: 'Pizzas', description: 'A sweet and savory mix of ham, pineapple, and mozzarella.', image_url: 'https://images.unsplash.com/photo-1566843942527-53734c2b92d3?w=500' },

    // Sides
    { name: 'French Fries', price: 149, category: 'Sides', description: 'Crispy, golden, and perfectly salted.', image_url: 'https://images.unsplash.com/photo-1576107232684-897a98fd1f82?w=500' },
    { name: 'Onion Rings', price: 179, category: 'Sides', description: 'Battered and fried to golden perfection.', image_url: 'https://images.unsplash.com/photo-1549487993-f2e4a95a4353?w=500' },
    { name: 'Garlic Bread', price: 199, category: 'Sides', description: 'Toasted with garlic butter and herbs.', image_url: 'https://images.unsplash.com/photo-1627308595186-e61b7f38f44a?w=500' },

    // Drinks
    { name: 'Coca-Cola', price: 60, category: 'Drinks', description: 'Classic and refreshing.', image_url: 'https://images.unsplash.com/photo-1622483767053-f58a6b2f6b3a?w=500' },
    { name: 'Sprite', price: 60, category: 'Drinks', description: 'Lemon-lime soda.', image_url: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=500' },
    { name: 'Water Bottle', price: 30, category: 'Drinks', description: 'Stay hydrated.', image_url: 'https://images.unsplash.com/photo-1581015889304-a1d2a18eda5e?w=500' }
];

const seedDatabase = async () => {
    const client = await pool.connect();
    try {
        console.log('Starting to seed the database...');
        await client.query('BEGIN');

        // Upsert menu items (insert new items or update existing ones)
        console.log('Upserting menu items...');
        for (const item of menuItems) {
            const { name, price, category, description, image_url } = item;
            await client.query(
                `INSERT INTO menu_items (name, price, category, description, image_url) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (name) DO UPDATE SET
                    price = EXCLUDED.price,
                    category = EXCLUDED.category,
                    description = EXCLUDED.description,
                    image_url = EXCLUDED.image_url`,
                [name, price, category, description, image_url]
            );
            console.log(`Upserted ${name}`);
        }
        console.log('All menu items inserted.');

        await client.query('COMMIT');
        console.log('Database seeded successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error seeding database:', error);
    } finally {
        client.release();
        pool.end();
    }
};

seedDatabase();
