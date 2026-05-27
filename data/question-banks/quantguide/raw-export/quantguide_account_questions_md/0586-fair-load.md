# QuantGuide Question

## 586. Fair Load

**Metadata**

- ID: `8phJkXyrzKaRgf6DpsXu`
- URL: https://www.quantguide.io/questions/fair-load
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Virtu Financial
- Source: glassdoor
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 09:08:40 America/New_York
- Last Edited By: Gabe

### 题干

Emma has two $6-$sided dice with the values $1-6$ on the sides. One of the dice is fair, while the other is loaded such that each side appears in proportion to the value on the side. Emma rolls both dice. Find the probability that the sum of the outcomes will odd.

### Hint

Emma can obtain an odd sum in two ways: The fair die is even and the loaded is odd OR The fair die is odd and the loaded is even. 

### 解答

Emma can obtain an odd sum in two ways: The fair die is even and the loaded is odd OR The fair die is odd and the loaded is even. 

$$$$

$\textbf{Case 1:}$ The fair die is even with probability $\dfrac{1}{2}$. The probability that the loaded die is odd is $\dfrac{1+3+5}{1+2+3+4+5+6} = \dfrac{3}{7}$

$$$$

$\textbf{Case 2:}$ The fair die is odd with probability $\dfrac{1}{2}$. The probability that the loaded die is even is $\dfrac{2+4+6}{21} = \dfrac{4}{7}$

$$$$

Putting it together, we have that the probability of an odd sum is $\dfrac{1}{2} \cdot \dfrac{3}{7} + \dfrac{1}{2} \cdot \dfrac{4}{7} = \dfrac{1}{2}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "8phJkXyrzKaRgf6DpsXu",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 09:08:40 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4703810,
    "source": "glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Fair Load",
    "topic": "probability",
    "urlEnding": "fair-load",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "easy",
    "id": "8phJkXyrzKaRgf6DpsXu",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Fair Load",
    "topic": "probability",
    "urlEnding": "fair-load"
  }
}
```
