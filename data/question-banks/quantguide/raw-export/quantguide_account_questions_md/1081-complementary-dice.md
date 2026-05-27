# QuantGuide Question

## 1081. Complementary Dice

**Metadata**

- ID: `p5Q66TaSuRLKbVsWZp2h`
- URL: https://www.quantguide.io/questions/complementary-dice
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: SIG
- Source: https://math.stackexchange.com/questions/1209677/two-players-are-playing-a-game-by-rolling-a-single-die?rq=1
- Tags: Conditional Probability, Games
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-3 10:34:42 America/New_York
- Last Edited By: Gabe

### 题干

Two players are playing a game by rolling a single standard die. Player $1$ rolls first. If the top surface of the die shows $1$ or $2$, then he wins. If not, then Player $2$ will roll the die. If the top surface of the die shows $3$, $4$, $5$, or $6$, then he wins. Else, the game is continues until there is a winner. Let $p_1$ and $p_2$ represent the probabilities that the two players win, respectively. Find $\text{max}\{p_1,p_2\}$.

### Hint

Compute $p_1$ as in the question. With probability $1/3$, he rolls a winning value on the first roll.

### 解答

Let's compute $p_1$ as in the question. With probability $1/3$, he rolls a winning value on the first roll. Otherwise, with probability $2/3$, he does not roll a winning value, and then player $2$ needs to not roll a winning value on their first roll, which occurs with probability $1/3$. In that case, the probability player $1$ wins is $p_1$ again. Therefore, $$p_1 = \dfrac{1}{3} + \dfrac{2}{9}p_1 \iff p_1 = \dfrac{3}{7}$$ This means that $p_2 = 1 -p_1 = \dfrac{4}{7}$, so the answer is $\dfrac{4}{7}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4/7"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "p5Q66TaSuRLKbVsWZp2h",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-3 10:34:42 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8817158,
    "source": "https://math.stackexchange.com/questions/1209677/two-players-are-playing-a-game-by-rolling-a-single-die?rq=1",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Complementary Dice",
    "topic": "probability",
    "urlEnding": "complementary-dice",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "p5Q66TaSuRLKbVsWZp2h",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Games"
      }
    ],
    "title": "Complementary Dice",
    "topic": "probability",
    "urlEnding": "complementary-dice"
  }
}
```
