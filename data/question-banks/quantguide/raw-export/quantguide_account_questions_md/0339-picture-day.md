# QuantGuide Question

## 339. Picture Day

**Metadata**

- ID: `T1PO7QQS2k6Sed51I5Gs`
- URL: https://www.quantguide.io/questions/picture-day
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Ten students of distinct heights are lining up for a picture. The photographer requires that the two tallest students stand in the two center positions and that the remaining students line up such that the heights strictly descend outwards. How many ways can the students line up?

### Hint

There are two ways for the tallest two students to be arranged. How many ways can the $4$ spots to the left of center be filled?

### 解答

There are two ways for the tallest two students to be arranged. Let us focus on the remaining eight students and concern ourselves with the four vacant positions to the left of the center. These four positions can be filled with any of the combination of the eight students, since each combination has one possible arrangement that follows the height invariant. The remaining four students that are not chosen must go to the other side of the line, of which there is only one arrangement to satisfy the height invariant. Thus, there are a total of ${8 \choose 4}$ possible arrangements of the eight non-center students. In total, because there are two possible arrangements of the two middle students, the total number of ways the students can line up is:

$${2 \choose 1} \times {8 \choose 4} = 140$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "140"
    ],
    "difficulty": "medium",
    "id": "T1PO7QQS2k6Sed51I5Gs",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 2597353,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Picture Day",
    "topic": "brainteasers",
    "urlEnding": "picture-day"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "T1PO7QQS2k6Sed51I5Gs",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Picture Day",
    "topic": "brainteasers",
    "urlEnding": "picture-day"
  }
}
```
