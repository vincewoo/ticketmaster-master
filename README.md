# 🎫 Ticketmaster Master

A browser-based game that simulates the chaotic TicketMaster experience! Race against the clock to snag the best deals on concert tickets while dealing with fluctuating prices, disappearing seats, and CAPTCHA challenges.

## 🎮 How to Play

1. Open `index.html` in your web browser
2. Click "Start Game" to begin
3. Click on available seats (green) to add them to your cart
4. Watch as prices constantly change - grab the deals fast!
5. Click "Checkout" when you're ready to purchase
6. Complete CAPTCHA challenges quickly (you only have 10 seconds!)
7. Maximize your savings in 2 minutes to get the highest score!

## 🎯 Game Features

### Dynamic Pricing
- Seat prices fluctuate every 3 seconds
- Prices can drop up to 30% or spike up to 30% from their base value
- Four price tiers: Budget ($50-80), Standard ($80-120), Premium ($120-200), VIP ($200-350)

### Seat Availability
- Seats randomly become available or unavailable every 2 seconds
- Simulates the "someone grabbed that seat" experience
- 70% of seats start as available

### CAPTCHA Challenges
- 60% chance of getting a CAPTCHA when checking out
- Only 10 seconds to solve it!
- 6-character codes with no confusing letters (no O/0, I/1, etc.)
- Fail the CAPTCHA and try again

### Scoring System
- Points are earned based on how much you save below the base price
- The bigger the discount, the higher your score!
- Track your total tickets purchased and total savings

### Game Timer
- 2 minutes to make your purchases
- Time keeps ticking even during CAPTCHA
- Final stats shown at game over

## 🛠️ Technical Details

### Files
- `index.html` - Main game structure
- `styles.css` - Game styling and responsive design
- `game.js` - Game logic and mechanics

### Browser Requirements
- Modern browser with JavaScript enabled
- Works on desktop and mobile devices
- No external dependencies or frameworks needed

## 🎨 Game Elements

- **Green Seats**: Available for purchase
- **Gray Seats**: Currently unavailable
- **Pink Seats**: In your cart
- **Stage**: Located at the top (best seats are closest!)

## 🏆 Tips for High Scores

1. Watch for price drops and act quickly
2. Add multiple seats to your cart before checking out
3. Practice solving CAPTCHAs fast
4. Don't waste time on expensive seats unless the price drops significantly
5. Keep an eye on the timer!

## 📝 Future Enhancements

Potential features to add:
- Different venue layouts
- Multiple price zones with varying demand
- Power-ups (price freeze, CAPTCHA skip, etc.)
- Multiplayer competition mode
- Difficulty levels
- Sound effects and animations
- Leaderboard system

## 🎉 Have Fun!

Enjoy the stress-free chaos of ticket buying simulation! Remember, in this game, you can actually win. 😄
