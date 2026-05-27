# QuantGuide Question

## 616. Colorful Socks II

**Metadata**

- ID: `rxkM54UYL4BlPfUQn3lR`
- URL: https://www.quantguide.io/questions/colorful-socks-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Original
- Tags: Events
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

$$10$ pairs of socks, each with a distinct color, are in a drawer. You draw out 3 socks at random. Find the probability that you obtain a matching pair.

### Hint

The first sock is arbitrary color. Condition on whether or not you get the sock of desired color on the $2$nd or $3$rd draw.

### 解答

Let the first sock be arbitrarily drawn. We can do this since there are the same amount of socks of each color in the drawer. To obtain 2 socks of matching color, we either need the first and second socks to match or we need the third sock to match one of the first two differing color socks.

$$$$

For the first case, the probability that we obtain a matching color sock on the second draw is $\dfrac{1}{19}$, as we drew out 1 sock and only 1 of the remaining $19$ is of that same color. After that, we are out of socks of that color, so it is irrelevant what we pick next. Alternatively, suppose the first and second socks differ in color. This occurs with probability $\dfrac{18}{19}$ by complementation. To get a pair, the third sock must match one of the first 2 colors of socks drawn. This occurs with probability $\dfrac{2}{18}$, as there are $2$ socks of the same color as the first two pairs drawn out of $18$ total. Therefore, the probability of this case is $\dfrac{2}{19}$. Adding the two cases together, our probability is $\dfrac{3}{19}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/19"
    ],
    "difficulty": "easy",
    "id": "rxkM54UYL4BlPfUQn3lR",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 4881981,
    "source": "Original",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Colorful Socks II",
    "topic": "probability",
    "urlEnding": "colorful-socks-ii"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "rxkM54UYL4BlPfUQn3lR",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Colorful Socks II",
    "topic": "probability",
    "urlEnding": "colorful-socks-ii"
  }
}
```
