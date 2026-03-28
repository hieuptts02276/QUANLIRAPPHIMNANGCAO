const path = require('path');
const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const app = express();
const db = new Database(path.join(__dirname, '..', 'cinema.db'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'cinema-secret-key', resave: false, saveUninitialized: false }));

function initDb() {
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS Users (UserID INTEGER PRIMARY KEY AUTOINCREMENT, Fullname TEXT NOT NULL, Date_of_birth TEXT, Gender TEXT, Phone TEXT, Email TEXT UNIQUE NOT NULL, Password TEXT NOT NULL, Role TEXT NOT NULL CHECK (Role IN ('admin','staff','customer')), Image TEXT, Active INTEGER DEFAULT 1, Created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS Cinemas (CinemaID INTEGER PRIMARY KEY AUTOINCREMENT, CinemaName TEXT NOT NULL, Address TEXT, Phone TEXT);
    CREATE TABLE IF NOT EXISTS Rooms (RoomID INTEGER PRIMARY KEY AUTOINCREMENT, RoomName TEXT NOT NULL, Capacity INTEGER NOT NULL, Status TEXT DEFAULT 'active', CinemaID INTEGER NOT NULL, FOREIGN KEY (CinemaID) REFERENCES Cinemas(CinemaID));
    CREATE TABLE IF NOT EXISTS Seats (SeatID INTEGER PRIMARY KEY AUTOINCREMENT, SeatNumber TEXT NOT NULL, SeatType TEXT, RoomID INTEGER NOT NULL, FOREIGN KEY (RoomID) REFERENCES Rooms(RoomID));
    CREATE TABLE IF NOT EXISTS Movies (MovieID INTEGER PRIMARY KEY AUTOINCREMENT, Title TEXT NOT NULL, Duration INTEGER, ReleaseDate TEXT, Description TEXT, Poster TEXT, Language TEXT, AgeRating TEXT, Status TEXT DEFAULT 'active');
    CREATE TABLE IF NOT EXISTS Showtimes (ShowtimeID INTEGER PRIMARY KEY AUTOINCREMENT, StartTime TEXT NOT NULL, EndTime TEXT NOT NULL, Price REAL NOT NULL, Status TEXT DEFAULT 'open', MovieID INTEGER NOT NULL, RoomID INTEGER NOT NULL, FOREIGN KEY (MovieID) REFERENCES Movies(MovieID), FOREIGN KEY (RoomID) REFERENCES Rooms(RoomID));
    CREATE TABLE IF NOT EXISTS Showtime_Seats (ShowtimeSeatID INTEGER PRIMARY KEY AUTOINCREMENT, Status TEXT DEFAULT 'available', SeatID INTEGER NOT NULL, ShowtimeID INTEGER NOT NULL, UNIQUE (SeatID, ShowtimeID), FOREIGN KEY (SeatID) REFERENCES Seats(SeatID), FOREIGN KEY (ShowtimeID) REFERENCES Showtimes(ShowtimeID));
    CREATE TABLE IF NOT EXISTS Bookings (BookingID INTEGER PRIMARY KEY AUTOINCREMENT, BookingDate TEXT DEFAULT CURRENT_TIMESTAMP, TotalAmount REAL DEFAULT 0, Status TEXT DEFAULT 'pending', UserID INTEGER NOT NULL, ShowtimeID INTEGER NOT NULL, FOREIGN KEY (UserID) REFERENCES Users(UserID), FOREIGN KEY (ShowtimeID) REFERENCES Showtimes(ShowtimeID));
    CREATE TABLE IF NOT EXISTS Booking_Details (BookingDetailID INTEGER PRIMARY KEY AUTOINCREMENT, Price REAL NOT NULL, BookingID INTEGER NOT NULL, ShowtimeSeatID INTEGER NOT NULL, FOREIGN KEY (BookingID) REFERENCES Bookings(BookingID), FOREIGN KEY (ShowtimeSeatID) REFERENCES Showtime_Seats(ShowtimeSeatID));
    CREATE TABLE IF NOT EXISTS Payments (PaymentID INTEGER PRIMARY KEY AUTOINCREMENT, Amount REAL NOT NULL, PaymentMethod TEXT, PaymentDate TEXT DEFAULT CURRENT_TIMESTAMP, Status TEXT DEFAULT 'paid', BookingID INTEGER NOT NULL, FOREIGN KEY (BookingID) REFERENCES Bookings(BookingID));
    CREATE TABLE IF NOT EXISTS Food (FoodID INTEGER PRIMARY KEY AUTOINCREMENT, FoodName TEXT NOT NULL, Price REAL NOT NULL, Status TEXT DEFAULT 'active', Type TEXT);
    CREATE TABLE IF NOT EXISTS Combos (ComboID INTEGER PRIMARY KEY AUTOINCREMENT, ComboName TEXT NOT NULL, Price REAL NOT NULL, Status TEXT DEFAULT 'active');
    CREATE TABLE IF NOT EXISTS Combo_Items (ComboItemID INTEGER PRIMARY KEY AUTOINCREMENT, Quantity INTEGER NOT NULL, ComboID INTEGER NOT NULL, FoodID INTEGER NOT NULL, FOREIGN KEY (ComboID) REFERENCES Combos(ComboID), FOREIGN KEY (FoodID) REFERENCES Food(FoodID));
    CREATE TABLE IF NOT EXISTS Food_Orders (FoodOrderID INTEGER PRIMARY KEY AUTOINCREMENT, TotalAmount REAL DEFAULT 0, Status TEXT DEFAULT 'ordered', BookingID INTEGER NOT NULL, FOREIGN KEY (BookingID) REFERENCES Bookings(BookingID));
    CREATE TABLE IF NOT EXISTS Food_Order_Details (FoodOrderDetailID INTEGER PRIMARY KEY AUTOINCREMENT, Quantity INTEGER NOT NULL, Price REAL NOT NULL, FoodOrderID INTEGER NOT NULL, ComboID INTEGER, FoodID INTEGER, FOREIGN KEY (FoodOrderID) REFERENCES Food_Orders(FoodOrderID), FOREIGN KEY (ComboID) REFERENCES Combos(ComboID), FOREIGN KEY (FoodID) REFERENCES Food(FoodID));
    CREATE TABLE IF NOT EXISTS Promotions (PromotionID INTEGER PRIMARY KEY AUTOINCREMENT, Name TEXT NOT NULL, DiscountPercent REAL NOT NULL, StartDate TEXT, EndDate TEXT, Status TEXT DEFAULT 'active');
  `);

  if (!db.prepare('SELECT COUNT(*) c FROM Users').get().c) {
    const pass = bcrypt.hashSync('123456', 10);
    db.prepare(`INSERT INTO Users (Fullname,Email,Password,Role) VALUES ('Admin System','admin@cinema.local',?,'admin'),('Staff One','staff@cinema.local',?,'staff'),('Customer One','customer@cinema.local',?,'customer')`).run(pass, pass, pass);
    const cinemaID = db.prepare('INSERT INTO Cinemas (CinemaName,Address,Phone) VALUES (?,?,?)').run('Fluent Cinema', 'HCM City', '0909000000').lastInsertRowid;
    const roomID = db.prepare('INSERT INTO Rooms (RoomName,Capacity,CinemaID) VALUES (?,?,?)').run('Room 1', 20, cinemaID).lastInsertRowid;
    for (let i = 1; i <= 20; i += 1) db.prepare('INSERT INTO Seats (SeatNumber,SeatType,RoomID) VALUES (?,?,?)').run(`A${i}`, i <= 4 ? 'VIP' : 'Standard', roomID);
    const movieID = db.prepare('INSERT INTO Movies (Title,Duration,ReleaseDate,Description,Language,AgeRating,Status) VALUES (?,?,?,?,?,?,?)').run('Dune: Resonance', 165, '2026-03-01', 'Sci-fi epic demo movie.', 'English', 'T16', 'active').lastInsertRowid;
    const showtimeID = db.prepare('INSERT INTO Showtimes (StartTime,EndTime,Price,MovieID,RoomID,Status) VALUES (?,?,?,?,?,?)').run('2026-03-28 19:00', '2026-03-28 21:45', 120000, movieID, roomID, 'open').lastInsertRowid;
    const seats = db.prepare('SELECT SeatID FROM Seats WHERE RoomID = ?').all(roomID);
    const st = db.prepare('INSERT INTO Showtime_Seats (Status,SeatID,ShowtimeID) VALUES (?,?,?)');
    seats.forEach((s) => st.run('available', s.SeatID, showtimeID));
    const food1 = db.prepare('INSERT INTO Food (FoodName,Price,Type) VALUES (?,?,?)').run('Popcorn', 50000, 'snack').lastInsertRowid;
    const food2 = db.prepare('INSERT INTO Food (FoodName,Price,Type) VALUES (?,?,?)').run('Coke', 30000, 'drink').lastInsertRowid;
    const comboID = db.prepare('INSERT INTO Combos (ComboName,Price) VALUES (?,?)').run('Combo Classic', 70000).lastInsertRowid;
    db.prepare('INSERT INTO Combo_Items (Quantity,ComboID,FoodID) VALUES (?,?,?)').run(1, comboID, food1);
    db.prepare('INSERT INTO Combo_Items (Quantity,ComboID,FoodID) VALUES (?,?,?)').run(1, comboID, food2);
    db.prepare('INSERT INTO Promotions (Name,DiscountPercent,StartDate,EndDate,Status) VALUES (?,?,?,?,?)').run('Weekend 10%', 10, '2026-03-01', '2026-12-31', 'active');
  }
}
initDb();

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login.html');
  return next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect('/login.html');
    if (!roles.includes(req.session.user.Role)) return res.redirect('/forbidden.html');
    return next();
  };
}

const page = (name) => path.join(__dirname, 'public', 'pages', name);

app.get('/', (req, res) => res.redirect('/dashboard.html'));
app.get('/login.html', (req, res) => res.sendFile(page('login.html')));
app.get('/dashboard.html', requireAuth, (req, res) => res.sendFile(page('dashboard.html')));
app.get('/movies.html', requireRole('admin', 'staff'), (req, res) => res.sendFile(page('movies.html')));
app.get('/showtimes.html', requireRole('admin', 'staff'), (req, res) => res.sendFile(page('showtimes.html')));
app.get('/foods.html', requireRole('admin', 'staff'), (req, res) => res.sendFile(page('foods.html')));
app.get('/promotions.html', requireRole('admin'), (req, res) => res.sendFile(page('promotions.html')));
app.get('/users.html', requireRole('admin'), (req, res) => res.sendFile(page('users.html')));
app.get('/booking.html', requireRole('customer'), (req, res) => res.sendFile(page('booking.html')));
app.get('/my-bookings.html', requireRole('customer'), (req, res) => res.sendFile(page('my-bookings.html')));
app.get('/forbidden.html', (req, res) => res.sendFile(page('forbidden.html')));

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM Users WHERE Email = ? AND Active = 1').get(email);
  if (!user || !bcrypt.compareSync(password, user.Password)) return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });
  req.session.user = { UserID: user.UserID, Fullname: user.Fullname, Role: user.Role, Email: user.Email };
  return res.json({ ok: true, role: user.Role });
});
app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get('/api/me', (req, res) => res.json({ user: req.session.user || null }));

app.get('/api/dashboard', requireAuth, (req, res) => {
  res.json({
    movies: db.prepare('SELECT COUNT(*) c FROM Movies').get().c,
    showtimes: db.prepare('SELECT COUNT(*) c FROM Showtimes').get().c,
    bookings: db.prepare('SELECT COUNT(*) c FROM Bookings').get().c,
    revenue: db.prepare("SELECT IFNULL(SUM(Amount),0) s FROM Payments WHERE Status = 'paid'").get().s
  });
});

app.get('/api/movies', requireRole('admin', 'staff'), (req, res) => res.json(db.prepare('SELECT * FROM Movies ORDER BY MovieID DESC').all()));
app.post('/api/movies', requireRole('admin', 'staff'), (req, res) => {
  const { Title, Duration, ReleaseDate, Description, Language, AgeRating, Status } = req.body;
  db.prepare('INSERT INTO Movies (Title,Duration,ReleaseDate,Description,Language,AgeRating,Status) VALUES (?,?,?,?,?,?,?)').run(Title, Number(Duration), ReleaseDate, Description, Language, AgeRating, Status || 'active');
  res.json({ ok: true });
});

app.get('/api/showtimes', requireRole('admin', 'staff'), (req, res) => {
  const movies = db.prepare('SELECT MovieID, Title FROM Movies WHERE Status = ?').all('active');
  const rooms = db.prepare('SELECT RoomID, RoomName FROM Rooms WHERE Status = ?').all('active');
  const showtimes = db.prepare('SELECT s.*, m.Title, r.RoomName FROM Showtimes s JOIN Movies m ON m.MovieID=s.MovieID JOIN Rooms r ON r.RoomID=s.RoomID ORDER BY ShowtimeID DESC').all();
  res.json({ movies, rooms, showtimes });
});
app.post('/api/showtimes', requireRole('admin', 'staff'), (req, res) => {
  const { StartTime, EndTime, Price, MovieID, RoomID } = req.body;
  const info = db.prepare('INSERT INTO Showtimes (StartTime,EndTime,Price,MovieID,RoomID,Status) VALUES (?,?,?,?,?,?)').run(StartTime, EndTime, Number(Price), Number(MovieID), Number(RoomID), 'open');
  const seats = db.prepare('SELECT SeatID FROM Seats WHERE RoomID = ?').all(Number(RoomID));
  const st = db.prepare('INSERT INTO Showtime_Seats (Status,SeatID,ShowtimeID) VALUES (?,?,?)');
  seats.forEach((s) => st.run('available', s.SeatID, info.lastInsertRowid));
  res.json({ ok: true });
});

app.get('/api/foods', requireRole('admin', 'staff', 'customer'), (req, res) => res.json({ foods: db.prepare('SELECT * FROM Food ORDER BY FoodID DESC').all(), combos: db.prepare('SELECT * FROM Combos ORDER BY ComboID DESC').all() }));
app.post('/api/foods', requireRole('admin', 'staff'), (req, res) => {
  const { FoodName, Price, Type } = req.body;
  db.prepare('INSERT INTO Food (FoodName,Price,Type,Status) VALUES (?,?,?,?)').run(FoodName, Number(Price), Type, 'active');
  res.json({ ok: true });
});
app.post('/api/combos', requireRole('admin', 'staff'), (req, res) => {
  const { ComboName, Price } = req.body;
  db.prepare('INSERT INTO Combos (ComboName,Price,Status) VALUES (?,?,?)').run(ComboName, Number(Price), 'active');
  res.json({ ok: true });
});

app.get('/api/promotions', requireRole('admin'), (req, res) => res.json(db.prepare('SELECT * FROM Promotions ORDER BY PromotionID DESC').all()));
app.post('/api/promotions', requireRole('admin'), (req, res) => {
  const { Name, DiscountPercent, StartDate, EndDate, Status } = req.body;
  db.prepare('INSERT INTO Promotions (Name,DiscountPercent,StartDate,EndDate,Status) VALUES (?,?,?,?,?)').run(Name, Number(DiscountPercent), StartDate, EndDate, Status || 'active');
  res.json({ ok: true });
});

app.get('/api/users', requireRole('admin'), (req, res) => res.json(db.prepare('SELECT UserID,Fullname,Email,Role,Active,Created_at FROM Users ORDER BY UserID DESC').all()));
app.post('/api/users', requireRole('admin'), (req, res) => {
  const { Fullname, Email, Password, Role } = req.body;
  db.prepare('INSERT INTO Users (Fullname,Email,Password,Role,Active) VALUES (?,?,?,?,1)').run(Fullname, Email, bcrypt.hashSync(Password, 10), Role);
  res.json({ ok: true });
});

app.get('/api/booking-data', requireRole('customer'), (req, res) => {
  const showtimes = db.prepare(`SELECT s.ShowtimeID,s.StartTime,s.Price,m.Title,r.RoomName FROM Showtimes s JOIN Movies m ON m.MovieID=s.MovieID JOIN Rooms r ON r.RoomID=s.RoomID WHERE s.Status='open' ORDER BY s.StartTime ASC`).all();
  const selectedShowtimeId = Number(req.query.showtime || (showtimes[0] && showtimes[0].ShowtimeID));
  const seats = selectedShowtimeId ? db.prepare(`SELECT ss.ShowtimeSeatID,ss.Status,st.SeatNumber FROM Showtime_Seats ss JOIN Seats st ON st.SeatID=ss.SeatID WHERE ss.ShowtimeID=? ORDER BY st.SeatNumber`).all(selectedShowtimeId) : [];
  const foods = db.prepare("SELECT * FROM Food WHERE Status='active'").all();
  const combos = db.prepare("SELECT * FROM Combos WHERE Status='active'").all();
  res.json({ showtimes, selectedShowtimeId, seats, foods, combos });
});

app.post('/api/book', requireRole('customer'), (req, res) => {
  const { showtimeId, seatIds, paymentMethod, foodId, comboId, foodQty, comboQty } = req.body;
  const selectedSeats = Array.isArray(seatIds) ? seatIds.map(Number) : seatIds ? [Number(seatIds)] : [];
  if (!showtimeId || !selectedSeats.length) return res.status(400).json({ error: 'Thiếu suất chiếu hoặc ghế' });
  const showtime = db.prepare('SELECT * FROM Showtimes WHERE ShowtimeID=?').get(Number(showtimeId));
  const bookingId = db.prepare('INSERT INTO Bookings (TotalAmount,Status,UserID,ShowtimeID) VALUES (?,?,?,?)').run(0, 'confirmed', req.session.user.UserID, Number(showtimeId)).lastInsertRowid;
  const lockSeat = db.prepare("UPDATE Showtime_Seats SET Status='booked' WHERE ShowtimeSeatID=? AND Status='available'");
  const detail = db.prepare('INSERT INTO Booking_Details (Price,BookingID,ShowtimeSeatID) VALUES (?,?,?)');
  let total = 0;
  selectedSeats.forEach((sid) => {
    if (lockSeat.run(sid).changes) {
      detail.run(showtime.Price, bookingId, sid);
      total += Number(showtime.Price);
    }
  });
  const today = new Date().toISOString().slice(0, 10);
  const promo = db.prepare("SELECT * FROM Promotions WHERE Status='active' AND StartDate<=? AND EndDate>=? ORDER BY DiscountPercent DESC LIMIT 1").get(today, today);
  if (promo) total -= (total * promo.DiscountPercent) / 100;

  const fQty = Number(foodQty || 0); const cQty = Number(comboQty || 0);
  if ((foodId && fQty > 0) || (comboId && cQty > 0)) {
    const foodOrderID = db.prepare('INSERT INTO Food_Orders (TotalAmount,Status,BookingID) VALUES (?,?,?)').run(0, 'ordered', bookingId).lastInsertRowid;
    let foodTotal = 0;
    if (foodId && fQty > 0) {
      const food = db.prepare('SELECT * FROM Food WHERE FoodID=?').get(Number(foodId));
      if (food) {
        const line = food.Price * fQty;
        db.prepare('INSERT INTO Food_Order_Details (Quantity,Price,FoodOrderID,FoodID) VALUES (?,?,?,?)').run(fQty, line, foodOrderID, food.FoodID);
        foodTotal += line;
      }
    }
    if (comboId && cQty > 0) {
      const combo = db.prepare('SELECT * FROM Combos WHERE ComboID=?').get(Number(comboId));
      if (combo) {
        const line = combo.Price * cQty;
        db.prepare('INSERT INTO Food_Order_Details (Quantity,Price,FoodOrderID,ComboID) VALUES (?,?,?,?)').run(cQty, line, foodOrderID, combo.ComboID);
        foodTotal += line;
      }
    }
    db.prepare('UPDATE Food_Orders SET TotalAmount=? WHERE FoodOrderID=?').run(foodTotal, foodOrderID);
    total += foodTotal;
  }

  db.prepare('UPDATE Bookings SET TotalAmount=? WHERE BookingID=?').run(total, bookingId);
  db.prepare('INSERT INTO Payments (Amount,PaymentMethod,Status,BookingID) VALUES (?,?,?,?)').run(total, paymentMethod || 'cash', 'paid', bookingId);
  res.json({ ok: true, bookingId });
});

app.get('/api/my-bookings', requireRole('customer'), (req, res) => {
  const rows = db.prepare('SELECT b.BookingID,b.BookingDate,b.TotalAmount,b.Status,m.Title,s.StartTime FROM Bookings b JOIN Showtimes s ON s.ShowtimeID=b.ShowtimeID JOIN Movies m ON m.MovieID=s.MovieID WHERE b.UserID=? ORDER BY BookingID DESC').all(req.session.user.UserID);
  res.json(rows);
});

app.listen(3000, () => console.log('Server running at http://localhost:3000'));
