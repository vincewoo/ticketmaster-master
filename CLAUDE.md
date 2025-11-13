# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ticket Sim** - A browser-based game simulating the TicketMaster ticket-buying experience. Players race against time to purchase concert tickets while dealing with:
- Dynamically changing prices
- Randomly appearing/disappearing seat availability
- CAPTCHA challenges with time pressure
- Scoring based on savings vs base prices

## Development Commands

Simply open `index.html` in a web browser - no build system required. The game uses vanilla JavaScript with no external dependencies.

## Architecture

### File Structure
- `index.html` - Main game structure with modals (start, CAPTCHA, game over)
- `styles.css` - Complete styling with responsive design
- `game.js` - All game logic and state management

### Game State Management
The game uses a single `gameState` object to track:
- Timer (2 minutes countdown)
- Score (based on savings)
- Cart (selected seats)
- Seats array (96 seats with pricing and availability)
- CAPTCHA state

### Key Game Mechanics
1. **Seat Updates**:
   - Availability changes every 2 seconds
   - Prices fluctuate every 3 seconds (±30% of base price)

2. **Pricing Tiers**: Four tiers from $50-350 base prices

3. **CAPTCHA System**:
   - 60% chance on checkout
   - 10-second countdown
   - 6-character alphanumeric codes

4. **Scoring**: Points earned = total savings (base price - purchase price)

## Key Patterns and Conventions

- Pure vanilla JS - no frameworks or libraries
- Event-driven architecture using `addEventListener`
- Interval-based game loop for timer and dynamic updates
- CSS Grid for seat layout (12x8 grid)
- Modal system for overlays (start, CAPTCHA, game over)
- Responsive design with mobile support
