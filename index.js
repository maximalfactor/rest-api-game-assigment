require("dotenv").config();
const express = require("express");
const mysql = require('mysql2/promise');

const port = 3001;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const conf = {
    host: process.env.host,
    user: process.env.user,
    password: process.env.pw,
    database: process.env.db
};

app.listen(port);


/*
**************************
AUTHOR: MAX NABBVIK
**************************
the game involves characters moving on a grid and attacking enemies which appear at different locations in the grid

############
###E########
#########E##        Example game state Where P is the player and E are the enemies
############
############
############
##P#########
############

*/





app.get("/pos", async (req, res) => {           //return player information by charID
    try {
        
        const connection = await mysql.createConnection(conf);
        const charID = req.query.charID;

        if(!charID) {
            res.status(400).json({error: "No request information"});
            return
        }

        var result = await connection.execute("SELECT posX, posY FROM hahmo WHERE charID=?", [charID]);
        
        if(!result[0]) {
            res.status(404).json({error: "character not found"});
            return
        }
        
        res.json(result[0]);
    }
    catch(e) {
        res.status(500).json({error: e.message});
    }
});

app.get("/enemies", async (req, res) => {               //return enemy information
    try {
        const connection = await mysql.createConnection(conf);
        res.json(await getAllEnemies(connection));
    }
    
    catch(e) {
        res.status(500).json({error: e.message});
    }

});

app.post("/enemies", async(req, res) => {                   //add new enemy at specified location
    try {
        const connection = await mysql.createConnection(conf);
        var fields = req.body;
        if(!fields.hp || !fields.posX || !fields.posY) {    //check required parametres for post request
            res.status(400).json({error: "Bad request"});
            return
        }

        var enemies = await getAllEnemies(connection);          //check that no enemies exist at that location
        if (enemies.some((enemy) => enemy.posX == fields.posX && enemy.posY == fields.posY)) {
            res.status(400).json({error: "Enemy already exists"});
            return
        }

        await connection.execute("INSERT INTO vihollinen (hp, posX, posY) VALUES (?,?, ?)", [fields.hp, fields.posX, fields.posY]);
        res.status(200).send("Added enemy");
    }
    
    catch(e) {
        res.status(500).json({error: e.message});
    }
});

app.post("/move", async (req, res) => {         //moves character a speacified amount
    try {
        const connection = await mysql.createConnection(conf);
        var fields = req.body;
        if(!fields.charID || !fields.x || !fields.y) {
            res.status(400).json({error: "Bad request"});
            return
        }
        await connection.execute("UPDATE hahmo SET posX=posX+?, posY=posY+? WHERE charID=?", [fields.x, fields.y , fields.charID]);
        res.status(200).send("Move successful");
    }
    
    catch(e) {
        res.status(500).json({error: e.message});
    }
});

app.post("/attack", async (req, res) => { //User specifies which grid square to target -> check if attacking character is adjacent -> check if there is an enemy on the square -> enemy takes damage
    try {
        const connection = await mysql.createConnection(conf);
        var fields = req.body;
        if(!fields.charID || !fields.x || !fields.y) {
            res.status(400).json({error: "Bad request"});
            return
        }


        //get player pos
        if(!fields.charID) {
            res.status(400).json({error: "No request information"});
            return
        }

        var playerPos = await connection.execute("SELECT posX, posY FROM hahmo WHERE charID=?", [fields.charID]);
        
        if(!playerPos[0]) {
            res.status(404).json({error: "character not found"});
            return
        }
        playerPos = playerPos[0][0];

        //check adjacency
        if(!(Math.abs(playerPos.posX - fields.x) <= 1) || !(Math.abs(playerPos.posY - fields.y) <= 1)) {      //check if specified square is not adjacent
            res.send("Not adjacent");
            return
        }

        //check enemy
        var enemies = await getAllEnemies(connection);
        for (let enemy of enemies) {
            if(enemy.posX == fields.x && enemy.posY == fields.y) {
                if(enemy.hp <= 1) {
                    await connection.execute("DELETE FROM vihollinen WHERE eID=?", [enemy.eID]);
                    res.send("Enemy killed");
                    return
                }

                await connection.execute("UPDATE vihollinen SET hp=hp-1 WHERE eID=?", [enemy.eID]);
                res.send("Enemy damaged");
                return
            }
        }
        res.send("enemy not hit");
    }
    
    catch(e) {
        res.status(500).json({error: e.message});
    }
});

async function getAllEnemies(conn) {
    var result = await conn.execute("SELECT * FROM vihollinen");
    return result[0]
};


