# QuantGuide Question

## 1034. Picky Casino

**Metadata**

- ID: `uZ9D4PDJLoWyYvEqRVPn`
- URL: https://www.quantguide.io/questions/picky-casino
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: jhu math comp
- Tags: Conditional Expectation, Expected Value, Games
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-8 11:48:22 America/New_York
- Last Edited By: Gabe

### 题干

A dealer at a casino holds a game that is played as follows: The player first pays $\$d$ to the dealer, where $d$ is some positive integer less than $100.$ The dealer then intends to flip a coin $d$ times. If at any point two consecutive heads are flipped, then the dealer stops flipping the coin, and the player wins and is awarded $\$100.$ Otherwise, the player loses (and is awarded nothing). A player pays the dealer $\$29.$ The dealer weights the coin before flipping it, changing the probability of flipping heads such that the player's expected net profit is non-positive. The player is not aware of this re-weighing. Find the maximum probability that the dealer should choose.

### Hint

Find the expected time needed to obtain $2$ consecutive heads on a coin with probability $x$ of heads. We want $x$ to be chosen such that $E=30,$ as that would guarantee that the player loses on average by definition.

### 解答

Let $E$ be the expected number of times one needs to flip the coin in order to obtain two consecutive heads, and let $E_1$ be the expected number of further flips one needs, given that a head was flipped, in order to obtain two consecutive heads. Let $x$ denote the probability of flipping heads.
$$$$


Then, we have the equations

    $$E=xE_1+(1-x)E+1$$
    $$E_1=(1-x)E+1$$

To see why, when we have either not flipped a heads or the previous flip was a tails, we have probability $x$ of getting a heads, and we need $E_1$ flips to win from here, and probability $(1-x)$ of getting a tails, and we need $E$ flips from here, as we are effectively back at the start (we add $1,$ which counts the impending flip). 

$$$$

Similarly, when we have flipped a heads, we have probability $x$ of getting another heads, and we need $0$ flips from there, and probability $(1-x)$ of getting a tails, and we need $E$ flips from here. 

$$$$

It is routine to solve the system above, which yields $E=\frac{1}{x}+\frac{1}{x^2}.$ We want $x$ to be chosen such that $E=30,$ as that would guarantee that the player loses on average by definition.

$$$$

Thus, we solve
\[ \frac{1}{x}+\frac{1}{x^2}=30, \]
and take the positive root for contextual reasons, which gives $x=\frac{1}{5}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/5"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "uZ9D4PDJLoWyYvEqRVPn",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-8 11:48:22 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8443210,
    "source": "jhu math comp",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Picky Casino",
    "topic": "probability",
    "urlEnding": "picky-casino",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "uZ9D4PDJLoWyYvEqRVPn",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Picky Casino",
    "topic": "probability",
    "urlEnding": "picky-casino"
  }
}
```
