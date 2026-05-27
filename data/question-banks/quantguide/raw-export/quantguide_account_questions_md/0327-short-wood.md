# QuantGuide Question

## 327. Short Wood

**Metadata**

- ID: `0UZh0D3TCInNyEFr5WF3`
- URL: https://www.quantguide.io/questions/short-wood
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: SIG, Akuna, Two Sigma
- Source: SIG OA modified
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-26 11:05:43 America/New_York
- Last Edited By: Gabe

### 题干

A lumberjack cuts a piece of wood of $1$ meter in length at $2$ uniformly randomly selected locations along the length of the wood. Find the probability the shortest piece of wood is at most $5$ centimeters.

### Hint

Let $X$ and $Y$ be the two distances from the LHS where the wood is cut (in meters). Both of these are IID $\text{Unif}(0,1)$ random variables. Since $X$ and $Y$ are IID, they are exchangeable. Thus, for simplicity, assume $Y > X$. Multiply by $2$ to account for when $Y < X$. Write your probability statement in terms of $X$ and $Y$.

### 解答

Let $X$ and $Y$ be the two distances from the LHS where the wood is cut (in meters). Both of these are IID $\text{Unif}(0,1)$ random variables. Since $X$ and $Y$ are IID, they are exchangeable. Thus, for simplicity, assume $Y > X$. We will multiply by 2 at the end to account for when $X > Y$. The lengths of the three pieces would then by given by $X, Y - X,$ and $1 - Y$. Thus, we want $\mathbb{P}[\text{min}(X,Y-X,1-Y) < 0.05] = 1 - \mathbb{P}[\text{min}(X,Y-X,1-Y) > 0.05]$. 

$$$$

By properties of the minimum, this is the same as $1 - \mathbb{P}[X >  0.05, Y > X + 0.05, Y < 0.95]$. The last two terms are obtained by rearranging the inequalities. Drawing the region where all three of those conditions are true out in the plane yields a triangular region. Since the slope is one, the two legs are of the same length. Note that $X > 0.05$ and $Y < 0.95$. Thus, we have that the endpoint of where we leave our region of interest is $X = 0.9$, as then $Y = 0.95$. 

$$$$

Thus, the length of each leg is $\dfrac{17}{20}$, so the area of the triangle is just $\dfrac{1}{2}\left(\dfrac{17}{20}\right)^2 = \dfrac{289}{800}$. Thus, we have that since $X$ and $Y$ are exchangeable, we multiply the above probability by $2$, so we get $\dfrac{289}{400}$, which means the probability is $\dfrac{111}{400}$ by complementation.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "111/400"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Two Sigma"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "0UZh0D3TCInNyEFr5WF3",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-26 11:05:43 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2528250,
    "randomizable": "",
    "source": "SIG OA modified",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Short Wood",
    "topic": "probability",
    "urlEnding": "short-wood",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Two Sigma"
      }
    ],
    "difficulty": "hard",
    "id": "0UZh0D3TCInNyEFr5WF3",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Short Wood",
    "topic": "probability",
    "urlEnding": "short-wood"
  }
}
```
