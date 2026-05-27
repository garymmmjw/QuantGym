# QuantGuide Question

## 922. Colorful Candy

**Metadata**

- ID: `pqByUtjdPdRzhYS9MO9W`
- URL: https://www.quantguide.io/questions/colorful-candy
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: original
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

A bag of 10 candies has 6 blue, 2 red, 1 green, and 1 yellow candies. 3 candies are randomly selected. Find the expected number of colors among the selected candies.

### Hint

Label the colors $1-4$, and let $C_i$ be the indicator that color $i$ is in our selection. Then $T = C_1 + \dots + C_4$ gives the total number of colors in our selection.

### 解答

Label the colors $1-4$, and let $C_i$ be the indicator that color $i$ is in our selection. Then $T = C_1 + \dots + C_4$ gives the total number of colors in our selection. By linearity of expectation, $\mathbb{E}[T] = \displaystyle \sum_{i=1}^4 \mathbb{E}[C_i]$. We evaluate $\mathbb{E}[C_i]$ in a unified manner. $\mathbb{E}[C_i]$ is just the probability color $i$ is somewhere in our draws, which is just $1 - $ the probability is in none of the draws. 

$$$$

Suppose color $i$ has $k$ candies of that color from the $10$. Then there are $\binom{10}{3}$ ways to pick 3 candies and $\binom{10-k}{3}$ ways to pick 3 candies that are not that color candy. Therefore, $\mathbb{E}[C_i] = 1 - \dfrac{\binom{10-k}{3}}{\binom{10}{3}}$ if candy $i$ has $k$ candies of that color. Therefore, the expectations for the 4 colors in the order they were presented is $1 - \dfrac{\binom{4}{3}}{120} = \dfrac{29}{30}, 1 - \dfrac{\binom{8}{3}}{120} = \dfrac{8}{15},$ and $1 - \dfrac{\binom{9}{3}}{120} = \dfrac{3}{10}$ for the last two. Adding these up, $\mathbb{E}[T] = 2.1$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2.1"
    ],
    "companies": [],
    "difficulty": "easy",
    "id": "pqByUtjdPdRzhYS9MO9W",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 7558322,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Colorful Candy",
    "topic": "probability",
    "urlEnding": "colorful-candy"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "pqByUtjdPdRzhYS9MO9W",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Colorful Candy",
    "topic": "probability",
    "urlEnding": "colorful-candy"
  }
}
```
