const sql = require('mssql');
const crypto = require('crypto');
const { get } = require('http');

// MSSQLデータベース接続情報
const config = {
    user: 'Tridentsotsuken',
    password: 'Sotsuken2023',
    server: 'trident-sotsuken-2023.database.windows.net',
    port: 1433,
    database: 'Order_Concierge_Ai',
    authentication: {
        type: 'default'
    },
    options: {
        encrypt: true
    }
};


async function authenticateUser(username, password) {
    try {
        // データベースに接続
        await sql.connect(config);
        console.log(username);
        console.log(password);

        // ユーザー名に基づいてパスワードと登録日時を取得
        const result = await sql.query`SELECT password, registration_date FROM user_table WHERE username = ${username}`;

        // 認証のロジック
        if (result.recordset.length === 1) {
            const storedPassword = result.recordset[0].password;
            const dbDateTime = result.recordset[0].registration_date;
            console.log(storedPassword);
            const dateObject = new Date(dbDateTime);
            const formattedDateTime = dateObject.toISOString().slice(0, 19).replace('T', ' ');

            console.log('Formatted DateTime:', formattedDateTime);

            const hashedPassword = crypto.createHash('sha256').update(password + formattedDateTime).digest('hex');

            if (hashedPassword === storedPassword) {
                return { status: 'success', userId: result.recordset[0].user_id };
            } else {
                return { status: 'failure', message: 'パスワードが一致しません' };
            }
        } else {
            // ユーザーが存在しない場合の処理
            return { status: 'failure', message: '存在しないユーザー' };
        }
    } catch (err) {
        console.log(config);
        console.error('データベースエラー:', err);
        throw err;
    } finally {
        // データベース接続を閉じる
        await sql.close();
    }
}


async function submitForm(user_name, password, email) {
    try {
        await sql.connect(config);
        var currentDate = new Date();
        var formattedDateTime = currentDate.toISOString().slice(0, 19).replace('T', ' ');

        const hashedPassword = crypto.createHash('sha256').update(password + formattedDateTime).digest('hex');
        console.log(formattedDateTime);
        const result = await sql.query`INSERT INTO user_table (username, password, email, registration_date) 
VALUES (${user_name}, ${hashedPassword}, ${email}, ${formattedDateTime})`;
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
            console.log('登録が成功しました。');
        } else {
            console.log('登録に失敗しました。');
        }
    } catch (err) {
        console.log(config);
        console.error('データベースエラー:', err);
    } finally {
        await sql.close();
    }
}

async function getUserIdByUsername(username) {
    try {
        await sql.connect(config);
        const result = await sql.query`SELECT user_id FROM user_table WHERE username = ${username}`;
        return result.recordset[0].user_id;
    } catch (err) {
        console.error('データベースエラー:', err);
    } finally {
        await sql.close();
    }
}

async function addCategory(category_name, user_id) {
    try {
        console.log(category_name);
        console.log(user_id);
        await sql.connect(config);
        const result = await sql.query`INSERT INTO CategoryTable (category_name,user_id) VALUES (${category_name},${user_id})`;
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
            console.log('カテゴリの登録が成功しました。');
            return { status: 'success', message: "登録成功" };
        } else {
            console.log('カテゴリの登録に失敗しました。');
            return { status: 'failure', message: "登録失敗" };
        }
    } catch (err) {
        if (err.message.includes("Cannot insert the value NULL into column 'category_id'")) {
            console.error('エラー: category_id に NULL を挿入することはできません。');
        } else {
            console.error('データベースエラー:', err);
        }
    } finally {
        await sql.close();
    }
}


async function getCategoriesByUserId(userId) {
    try {
        await sql.connect(config);
        const result = await sql.query`SELECT * FROM CategoryTable WHERE user_id = ${userId}`;
        return result.recordset;
    } catch (err) {
        console.error('データベースエラー:', err);
    } finally {
        await sql.close();
    }
}

async function addDish(userId, dish_name, category_id, description, image, price, tags) {
    try {
        await sql.connect(config);
        const result = await sql.query`INSERT INTO DishMaster (user_id,dish_name, category_id, description,image, price,tags) VALUES (${userId},${dish_name}, ${category_id}, ${description}, ${image},${price}, ${tags})`;
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
            console.log('料理の登録が成功しました。');
            return { status: 'success', message: "登録成功" };
        } else {
            console.log('料理の登録に失敗しました。');
            return { status: 'failure', message: "失敗" };
        }
    } catch (err) {
        console.error('データベースエラー:', err);
        return { status: 'failure', message: "失敗" };
    } finally {
        await sql.close();
    }
}

async function getDishesByUserId(userId) {
    try {
        await sql.connect(config);
        const result = await sql.query`SELECT * FROM DishMaster WHERE user_id = ${userId}`;
        return result.recordset;
    } catch (err) {
        console.error('データベースエラー:', err);
    } finally {
        await sql.close();
    }
}


async function getTableinfo(userId) {
    try {
        await sql.connect(config);
        const result = await sql.query`SELECT * FROM tableInformation_table WHERE user_id = ${userId} AND table_flag = 0;
    `;
        return result.recordset;
    } catch (err) {
        console.error('データベースエラー:', err);
    } finally {
        await sql.close();
    }
}

async function updateTableflg_end(tableId, userId) {
    try {
        await sql.connect(config);
        const result = await sql.query`UPDATE tableInformation_table SET tableflag = 0 WHERE table_id = ${tableId} AND user_id = ${userId};`
        return result.recordset;
    } catch (err) {
        console.error('データベースエラー:', err);
    } finally {
        await sql.close();
    }
}


async function get_history( userId,tableId) {
    try {
        await sql.connect(config);
        const result =await sql.query`SELECT * FROM order_table WHERE user_id = ${userId} AND table_id = ${tableId};`;
        return result.recordset;
    } catch (err) {
        console.error('データベースエラー:', err);
    } finally {
        await sql.close();
    }
}


async function updateTableflg_start(tableId, userId) {
    try {
        await sql.connect(config);
        const result = await sql.query`UPDATE tableInformation_table SET table_flag = 1 WHERE table_id = ${tableId} AND user_id =${userId};`
        return result.recordset;
    } catch (err) {
        console.error('データベースエラー:', err);
    } finally {
        await sql.close();
    }
}

async function addOrder(order,user_id,table_id) {
    const { dish_id,quantity } = order;
    const order_date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    try {
        if (!sql.connected) {
            await sql.connect(config);
        }
        const result = await sql.query`INSERT INTO order_table (user_id, dish_id, table_id, order_date, quantity) VALUES (${user_id}, ${dish_id}, ${table_id}, ${order_date}, ${quantity});`;
        return {status:'success'};
    } catch (err) {
        console.error('データベースエラー:', err);
        throw err;
    } finally {
        await sql.close();
    }
}
module.exports = {
    addOrder: addOrder,
    authenticateUser: authenticateUser,
    submitForm: submitForm,
    getUserIdByUsername: getUserIdByUsername,
    addCategory: addCategory,
    getCategoriesByUserId: getCategoriesByUserId,
    addDish: addDish,
    getDishesByUserId: getDishesByUserId,
    updateTableflg_end: updateTableflg_end,
    updateTableflg_start: updateTableflg_start,
    getTableinfo: getTableinfo,
    get_history: get_history
};
