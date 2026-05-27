# QuantGuide Question

## 216. Colorful Line

**Metadata**

- ID: `Ih0juZJpGB11eCJY4djd`
- URL: https://www.quantguide.io/questions/colorful-line
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: IMC
- Source: imc
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 08:35:52 America/New_York
- Last Edited By: Gabe

### 题干

How many distinct ways can you arrange $3$ red balls, $7$ blue balls, and $9$ green balls in a line?

### Hint

Think about this in terms of anagrams, where every arrange corresponds to a string of red, green, and blue.

### 解答

This is a classic anagrams problem, where we have three distinct groups (corresponding to the three colors) and every string corresponds to an arrangement of red, green, and blue. There are $19$ total balls, so if all were distinct, then there are $19!$ ways to arrange them. However, this overcounts by considering every ball distinct, where balls of the sample color are not distinct. Therefore, we must divide out those arrangements. There are $9!$ arrangements of the $9$ red balls that aren't distinct. Similarly, there are $7!$ and $3!$ ways to arrange for the other colors, so the answer is $$\dfrac{19!}{9!7!3!} = 11085360$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "11085360"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "Ih0juZJpGB11eCJY4djd",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 08:35:52 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1718452,
    "source": "imc",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Colorful Line",
    "topic": "probability",
    "urlEnding": "colorful-line",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "Ih0juZJpGB11eCJY4djd",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Colorful Line",
    "topic": "probability",
    "urlEnding": "colorful-line"
  }
}
```
