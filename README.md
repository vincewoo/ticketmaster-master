# 🎫 Ticketmaster Master

A browser-based game that simulates the chaotic TicketMaster experience! Race against the clock to snag the best deals on concert tickets while dealing with fluctuating prices, disappearing seats, CAPTCHA challenges, and target matching objectives. Play solo or compete with a friend in real-time multiplayer mode!

## 🎮 How to Play

1. Open `index.html` in your web browser
2. Choose **Single Player** or **Multiplayer** mode
   - **Single Player**: Race against the clock
   - **Multiplayer**: One player hosts a game and shares the code, the other joins to compete for the same seats!
3. Match the **target ticket count** shown at the top by selecting adjacent seats in the same row
4. Click on available seats (blue) to add them to your cart
5. Watch as prices constantly change - grab the deals fast!
6. Can't find adjacent seats? Use **Skip Target** for a -50 pts penalty
7. Click "Checkout" when you have the right number of tickets
8. Complete CAPTCHA challenges quickly (you only have 10 seconds!)
9. Maximize your savings in 2 minutes to get the highest score!

## 🎯 Game Features

### Multiplayer Mode
- **Host-Authoritative Architecture**: The host generates all game state and synchronizes with the guest
- Real-time competition using WebRTC (PeerJS)
- Both players see the same seats, prices, and availability
- **Compete for the same tickets**: Both players can select the same seats - whoever completes the CAPTCHA first wins!
- You won't know if your opponent is targeting the same seats until the CAPTCHA warning appears
- See your opponent's score in real-time

### Target Ticket System
- Each round, you're given a target number of tickets to purchase (1-4 tickets)
- Seats must be adjacent (side-by-side) in the same row
- Can't find adjacent seats? Skip the target for a -50 pts penalty
- New target appears after each successful purchase or skip

### Dynamic Pricing with Visual Indicators
- All face values are multiples of $20 for clean pricing
- Seat prices fluctuate every 3 seconds
- Prices can drop up to 30% or spike up to 30% from their base value
- **Color-coded price display** shows deal quality at a glance:
  - **Dark Green**: 20%+ discount (amazing deal!)
  - **Medium Green**: 10-19% discount (great deal)
  - **Light Green**: 5-9% discount (good deal)
  - **Very Light Green**: 0-4% discount (small savings)
  - **Light Red**: 0-5% premium (slightly overpriced)
  - **Medium Red**: 5-10% premium (overpriced)
  - **Dark Red**: 10%+ premium (very overpriced)

### Seat Availability
- Seats randomly become available or unavailable every 2 seconds
- Simulates the "someone grabbed that seat" experience
- 70% of seats start as available
- In multiplayer, claimed seats become unavailable to the opponent

### CAPTCHA Challenges
- 60% chance of getting a CAPTCHA when checking out
- **100% chance if you're competing with opponent for the same seats!**
- Only 10 seconds to solve it!
- 6-character codes with no confusing letters (no O/0, I/1, etc.)
- Fail the CAPTCHA and try again
- Warning displayed if opponent is competing for the same seats

### Scoring System
- Points are earned based on how much you save below the base price
- The bigger the discount, the higher your score!
- Skip penalty: -50 pts per skipped target
- Track your total tickets purchased and total savings
- **Purchase History Review** at game end:
  - View all purchases with seat numbers sorted by row and column
  - See face value, paid price, and discount/premium percentage for each seat
  - Purchase totals showing total face value, total paid, and total savings/premium

### Game Timer
- 2 minutes to make your purchases
- Time keeps ticking even during CAPTCHA
- Final stats shown at game over including purchase breakdown

## 🛠️ Technical Details

### Files
- `index.html` - Main game structure with modals for single/multiplayer modes
- `styles.css` - Game styling and responsive design
- `game.js` - Game logic, multiplayer synchronization, and mechanics

### Browser Requirements
- Modern browser with JavaScript enabled
- WebRTC support for multiplayer mode
- Works on desktop and mobile devices

### External Dependencies
- PeerJS (v1.5.1) - WebRTC peer-to-peer networking for multiplayer

## 🎨 Game Elements

- **Blue Seats**: Available for purchase (gradient background for better text visibility)
- **Gray Seats**: Currently unavailable
- **Pink Seats**: In your cart
- **Stage**: Located at the top (best seats are closest!)
- **Price Colors**: Green text for discounts, red text for premiums (see pricing tiers above)

## 🏆 Tips for High Scores

1. Look for dark green prices - those are the best deals (20%+ discount)
2. Match the target count with adjacent seats for valid purchases
3. Use the skip button strategically - sometimes -50 pts is better than waiting
4. Watch for price drops and act quickly before they change again
5. Practice solving CAPTCHAs fast - you only have 10 seconds!
6. Don't waste time on red-priced seats unless necessary to match the target
7. In multiplayer, be faster than your opponent to claim the best seats
8. Keep an eye on the timer - you have 2 minutes total!

## 📝 Implemented Features

This game started as a simple single-player ticket rush simulator and has evolved to include:
- ✅ Multiplayer competition mode with real-time synchronization
- ✅ Target ticket matching system with adjacency requirements
- ✅ Color-coded pricing with 7-tier visual indicators
- ✅ Purchase history review with detailed breakdowns
- ✅ Skip target functionality for impossible scenarios
- ✅ Host-authoritative multiplayer architecture for perfect sync

## 📝 Future Enhancements

Potential features to add:
- Different venue layouts and seating configurations
- Multiple price zones with varying demand
- Power-ups (price freeze, CAPTCHA skip, etc.)
- Difficulty levels (longer/shorter timers, harder CAPTCHAs)
- Sound effects and animations
- Persistent leaderboard system
- Spectator mode for multiplayer games

## 🎉 Have Fun!

Enjoy the stress-free chaos of ticket buying simulation! Remember, in this game, you can actually win. 😄
