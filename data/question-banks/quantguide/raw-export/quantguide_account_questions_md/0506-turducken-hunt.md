# QuantGuide Question

## 506. Turducken Hunt

**Metadata**

- ID: `txEZGu2s3fC8fbbe5n6T`
- URL: https://www.quantguide.io/questions/turducken-hunt
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: N/A
- Source: mse
- Tags: Games
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-2 12:05:06 America/New_York
- Last Edited By: Gabe

### 题干

Mordecai and Rigby are hunting for a Turducken. They both start at $x = 0$ and see a Turducken $1$ meter away. Mordecai and Rigby start walking at the same rate towards $x = 1$. They each have only one bullet in their guns and they can take it out and shoot at any point along the walk. Given that they are at position $x$, Mordecai has probability $m(x) = x$ of hitting the Turducken with his shot. Rigby has probability $r(x) = x^2$ of hitting the Turducken. If they shoot at the same time and both miss or hit the Turducken, then they just start again with a new Turducken. If exactly one of them hits the Turducken, then that person gets to keep it for Thanksgiving dinner. They don't neccesarily need to shoot at the same time. Assuming both Mordecai and Rigby apply an optimal strategy, what is Mordecai's chance of keeping the Turducken? The answer is in the form $\dfrac{\sqrt{a} - b}{c}$ for integers $a,b,c > 0$ that are pairwise relatively prime. Find $a + b + c$. Note that Mordecai and Rigby both know $m(x)$ and $r(x)$.

### Hint

Suppose that Mordecai shoots first at position $x$. Then with probability $x$ he wins, while with probability $1-x$, Rigby wins. Alternatively, if Rigby shoots first at position $x$, then with probability $x^2$ he wins, while with probability $1-x^2$, Mordecai wins. Therefore, the optimal strategy for each is to minimize the other person's chance of winning.

### 解答

Suppose that Mordecai shoots first at position $x$. Then with probability $x$ he wins, while with probability $1-x$, Rigby wins. Alternatively, if Rigby shoots first at position $x$, then with probability $x^2$ he wins, while with probability $1-x^2$, Mordecai wins. Therefore, the optimal strategy for each is to minimize the other person's chance of winning. For Mordecai, this function that he needs to minimize is $\text{max}\{x^2,1-x\}$. For Rigby, this function is $\text{min}\{x,1-x^2\}$.

$$$$

However, note that $x^2$ is monotonically increasing and $1-x$ is monotonically decreasing. Similarly, $x$ is monotonically increasing and $1-x^2$ is monotonically decreasing. Therefore, for each function, there is a unique point at which the two respective functions are equal and that will be the minimum. 

$$$$

For Mordecai, the equation that must be solved is $x^2 = 1-x$. For Rigby, the equation that needs to be solved is $x = 1-x^2$. However, by rearranging both equations, we can see that the optimal $x$ for both is when $x + x^2 = 1$. This implies that they should both shoot at the same time. Solving this quadratic equation yields the optimal $x^* = \dfrac{\sqrt{5} - 1}{2}$. 

$$$$

Rigby's equation is the chance of Mordecai winning, so as $x^* = 1-(x^*)^2$, we have that Mordecai's chance of winning is just $\dfrac{\sqrt{5} - 1}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "8"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "txEZGu2s3fC8fbbe5n6T",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-2 12:05:06 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4041618,
    "source": "mse",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Turducken Hunt",
    "topic": "probability",
    "urlEnding": "turducken-hunt",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "txEZGu2s3fC8fbbe5n6T",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Turducken Hunt",
    "topic": "probability",
    "urlEnding": "turducken-hunt"
  }
}
```
