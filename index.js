import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "4321",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;
let users = [];

async function checkVisisted() {
  const result = await db.query("SELECT country_code FROM visited_countries where user_id = $1", [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId);
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});


app.post("/add", async (req, res) => {
  const enteredCountry = req.body.country.toLowerCase();
  try {
    let result = await db.query(
      "select country_code from countries where lower(country_name) = $1",
      [enteredCountry]
    );
    // console.log("first query inside add");

    if (result.rows.length == 0) {
          // console.log("second query inside add");
      result = await db.query(
        "select country_code from countries where lower(country_name) like '%' || $1 || '%'",
        [enteredCountry]
      );
    }
    if (result.rows.length !== 0) {
      // console.log(result.rows.length);
      const data = result.rows[0];
      const countryCode = data.country_code;
      try {
        await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]);
        res.redirect("/");
        // console.log("third query inside add");
      } catch (err) {
        // console.log(err.code);
        // console.log("catch after third query inside add");
        // console.error(err);
        const countries = await checkVisisted();
        const currentUser = await getCurrentUser();
        res.render("index.ejs", {
          countries: countries,
          total: countries.length,
          users: users,
          color: currentUser.color,
          error: "Country has already been added, try again.",
        });
      }
    } else {
      // console.log("else after catch inside add");
      const countries = await checkVisisted();
      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        users: users,
        color: currentUser.color,
        error: "Country has already been added, try again.",
      });
    }
  } catch (err) {
    // console.log(err);
    // console.log("catch after else inside add");
    const countries = await checkVisisted();
    const currentUser = await getCurrentUser();
    // console.log(err.code);
    // console.log("else inside last catch inside add");
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: currentUser.color,
      error: "Re-type the country name",
    });
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
 const name = req.body.name;
 const color = req.body.color;

 const result = await db.query(
   "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
   [name, color]
 );

 const id = result.rows[0].id;
 currentUserId = id;

 res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
