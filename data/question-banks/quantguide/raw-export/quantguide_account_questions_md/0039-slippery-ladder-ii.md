# QuantGuide Question

## 39. Slippery Ladder II

**Metadata**

- ID: `zqUck7gHYeNOuaEnCvZQ`
- URL: https://www.quantguide.io/questions/slippery-ladder-ii
- Topic: pure math
- Difficulty: medium
- Internal Difficulty: 2
- Companies: TransMarket Group
- Source: Original
- Tags: Calculus
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-8 10:15:24 America/New_York
- Last Edited By: Gabe

### 题干

A $50-$ft ladder is placed against a vertical wall of a large building. The base of the ladder is in oil, which makes the base slip and the tip of the ladder slide down the wall. The base of the ladder slips away from the wall at a constant rate of $4$ feet per minute. Find the rate at which the angle between the ladder and ground is decreasing (in radians per minute) when the base of the ladder is $30$ feet away from the wall.

### Hint

Use the result of Slippery Ladder I and also $\tan\theta = \dfrac{y}{x}$.

### 解答

We can view the ladder as the hypotenuse of a triangle whose sites are the ground and the wall. Using Pythagorean Theorem, we find that $$30^2 + y^2 = 50^2 \iff y = 40$$ Therefore, the tip of the ladder is $40$ feet above ground at that time. Using the result from Slippery Ladder I that $y' = -3$ at this instant, we can find the rate of change of the angle by using $\tan\theta = \dfrac{y}{x}$ Taking the derivative of both sides, we see that $$\sec^2\theta \theta' = \dfrac{xy' - yx'}{x^2}$$ We know that $y = 40$ and $x = 30$ at this instant, so $\sec^2\theta = 1 + \tan^2\theta = 1 + \dfrac{y^2}{x^2} = \dfrac{25}{9}$. With all of this information, we plug in and get $$\dfrac{25}{9}\theta' = \dfrac{30(-3) - 40(4)}{30^2} \iff \theta' = -\dfrac{1}{10}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/10",
      "-1/10"
    ],
    "companies": [
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "zqUck7gHYeNOuaEnCvZQ",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 10:15:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 289924,
    "source": "Original",
    "status": "published",
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Slippery Ladder II",
    "topic": "pure math",
    "urlEnding": "slippery-ladder-ii",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "medium",
    "id": "zqUck7gHYeNOuaEnCvZQ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Calculus"
      }
    ],
    "title": "Slippery Ladder II",
    "topic": "pure math",
    "urlEnding": "slippery-ladder-ii"
  }
}
```
