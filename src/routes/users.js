const {Router} = require('express');
const db = require("../../db/db");

const router = Router();

//Проверка сессии текущего пользователя.
router.use((req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.sendStatus(401);
    }
});

//Список пользователей.
router.get('', async (req, res) => {
    const users = await db('users')
        .join('categories', 'users.category_id', 'categories.id')
        .join('regions', 'users.region_id', 'regions.id')
        .select(
            'users.id',
            'users.username',
            'users.email',
            'users.category_id',
            'categories.name as category',
            'users.region_id',
            'regions.city',
            'users.created_at',
            'users.updated_at'
        );

    if (users) {
        res.status(200).send(users);
    } else {
        res.status(404).send('No users found');
    }
});

// Поиск пользователя по идентификатору
router.get('/:id',
    async (req, res) => {
        const {id} = req.params;

        const user = await db('users')
            .where('id', '=', id)
            .select(
                'id',
                'username',
                'email',
                'category_id',
                'region_id'
            )
            .first();

        if (user) {
            res.send(user);
        } else {
            res.sendStatus(404);
        }
    },
);

//транзакции. Явно указывать коммит не нужно
router.post('/update', async (req, res) => {
    const {id, username, email, category_id, name, region_id, city} = req.body;
    const dateNow = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await db.transaction(function (transaction) {
        return db('categories')
            .transacting(transaction)
            .insert({id: category_id, name})

            .then(function () {
                return transaction('regions')
                    .insert({id: region_id, city})
            })
            .then(function () {
                return transaction('users')
                    .where('id', '=', id)
                    .update({username, email, category_id, region_id, updated_at: dateNow});
            })
    })
        .then(function () {
            console.log('Updated successfully!');
            res.sendStatus(200);
        })
        .catch(function (err) {
            console.log(`Failed to update a user. Error - ${err}`);
            res.sendStatus(500);
        });
});

module.exports = router;