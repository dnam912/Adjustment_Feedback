//= laz r
//= 02-23-2026 15:22
//= server.js

//= Dependencies =//
import express from "express";
import { connectToDatabase } from "./database.js";

const db = connectToDatabase('audioData');

const app = express();
const PORT = process.env.PORT || 3000;

function convertToInt(strVal) {
    return Number(strVal);
}


//=== MIDDLEWARE ===//

app.set("view engine", "ejs");
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
app.use(express.static("./"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//=== ROUTES ===//

//= WEB PAGE ROUTES

app.get("/", (req, res) => {
    try {
        res.sendFile("index.html")
    } catch (err) {
        console.error(err);
        res.status(500).send("internal server error: function listEvents()")
    }
});

app.get("/integration", (req, res) => {
    try {
        const event_data = db.listEvents();
        res.render("home", { event_data })
    } catch (err) {
        console.error(err);
        res.status(500).send("internal server error: function listEvents()")
    }
});

app.get("/events/create", (req, res) => {
    res.render("events-create");
});

app.post("/events/create", async (req, res) => {
    console.log(req.body);
    const { volume, l_frequency, m_frequency, h_frequency, pain, dull, env_tags, env_dB } = req.body;

    if (!(volume && l_frequency && m_frequency && h_frequency && pain && dull && env_dB)) {
        return res.status(400).send("All fields except environment tags are required");
    }

    const envTagsValue = env_tags ?? "";

    if (typeof envTagsValue !== "string") {
        return res.status(400).send("Env tags must be of type string");
    }

    let date_added = new Date();

    date_added = date_added.toISOString();

    let date_modified = date_added;

    try {

        await db.createItem(
            convertToInt(volume),
            convertToInt(l_frequency),
            convertToInt(m_frequency),
            convertToInt(h_frequency),
            convertToInt(pain),
            convertToInt(dull),
            env_tags,
            convertToInt(env_dB),
            date_added,
            date_modified);
        res.redirect("/integration");
    } catch (err) {
        console.error(err);
        res.status(500).send("internal server error");
    }
});

app.get("/events/update/:id", async (req, res) => {
    const id = req.params.id;

    try {
        const event = await db.getItem(id);

        if (!event) {
            return res.status(404).send("Item not found!");
        }

        res.render("events-update", { event: event });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal server error");
    }
});

app.post("/events/update/:id", async (req, res) => {
    const id = req.params.id;
    const { volume, l_frequency, m_frequency, h_frequency, pain, dull, env_tags, env_dB, date_added } = req.body;

    if (!(volume && l_frequency && m_frequency && h_frequency && pain && dull && env_dB)) {
        return res.status(400).send("All fields except environment tags are required");
    }

    const envTagsValue = env_tags ?? "";

    if (typeof envTagsValue !== "string") {
        return res.status(400).send("Env tags must be of type string");
    }

    let date_modified = new Date();

    date_modified = date_modified.toISOString();

    try {
        const result = await db.updateItem(id, volume, l_frequency, m_frequency, h_frequency, pain, dull, env_tags, env_dB, date_added, date_modified);
        console.log(result);

        if (result.changes === 0) {
            return res.status(404).send("item not found");
        }

        res.redirect("/integration");
    } catch (err) {
        console.error(err);
        res.status(500).send("internal server error");
    }

});

app.get("/events/delete/:id", async (req, res) => {
    const id = req.params.id;

    try {
        const result = await db.deleteItem(id);
        console.log(result);

        if (result.changes === 0) {
            return res.status(404).send("item not found");
        }

        res.redirect("/integration");
    } catch (err) {
        console.error(err);
        res.status(500).send("internal server error");
    }
})

//= API ROUTES


//=== START SERVER ===//
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});