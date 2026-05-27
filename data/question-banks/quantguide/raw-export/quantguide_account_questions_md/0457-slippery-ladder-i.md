# QuantGuide Question

## 457. Slippery Ladder I

**Metadata**

- ID: `6xpWLKzv2NRHNxqqkGCI`
- URL: https://www.quantguide.io/questions/slippery-ladder-i
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 2
- Companies: TransMarket Group
- Source: https://faculty.math.illinois.edu/~lfolwa2/GW_101217_Sol.pdf
- Tags: Calculus
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-8 10:15:19 America/New_York
- Last Edited By: Gabe

### 题干

A $50-$ft ladder is placed against a vertical wall of a large building. The base of the ladder is in oil, which makes the base slip and the tip of the ladder slide down the wall. The base of the ladder slips away from the wall at a constant rate of $4$ feet per minute. Find the rate at which the tip of the ladder is sliding down the wall (in feet per minute) when the base of the ladder is $30$ feet away from the wall.

### Hint

We can view the ladder as the hypotenuse of a triangle whose sites are the ground and the wall. Use Pythagorean Theorem.

### 解答

We can view the ladder as the hypotenuse of a triangle whose sites are the ground and the wall. Using Pythagorean Theorem, we find that $$30^2 + y^2 = 50^2 \iff y = 40$$ Therefore, the tip of the ladder is $40$ feet above ground at that time. We now take the derivative of both sides of $x^2 + y^2 = z^2$. We know that $x' = 3$, as the base length is increasing as the ladder slips down the wall. Furthermore, $z' = 0$, as the ladder doesn't change in length. We want $y'$. The derivative is $2xx' + 2yy' = 2zz'$. However, the RHS is $0$ by the fact $z' = 0$. Therefore, we can just plug in and solve for $y'$. $$2(30)(4) + 2(40)y' = 0 \iff y' = -3$$ This means that our answer is $3$, as the ladder slides down the wall at a rate of $3$ feet per minute.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "companies": [
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "6xpWLKzv2NRHNxqqkGCI",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 10:15:19 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3669475,
    "source": "https://faculty.math.illinois.edu/~lfolwa2/GW_101217_Sol.pdf",
    "status": "published",
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Slippery Ladder I",
    "topic": "pure math",
    "urlEnding": "slippery-ladder-i",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "id": "6xpWLKzv2NRHNxqqkGCI",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Slippery Ladder I",
    "topic": "pure math",
    "urlEnding": "slippery-ladder-i"
  }
}
```
