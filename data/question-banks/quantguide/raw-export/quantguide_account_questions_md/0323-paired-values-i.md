# QuantGuide Question

## 323. Paired Values I

**Metadata**

- ID: `uiSXbNiymxLC7YlY62Do`
- URL: https://www.quantguide.io/questions/paired-values-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: gabe
- Tags: Combinatorics, Events
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-7 13:57:38 America/New_York
- Last Edited By: Gabe

### 题干

Suppose we have the values $1-6$ in a bowl. We draw them without replacement, noting the order in which we selected them. We multiply the first two values together, the next two values together, and the last two values together. Lastly, we add the three products above. Find the probability the sum is odd.

### Hint

To get an odd sum, we have $1$ odd term and $2$ even terms ($3$ odd terms is impossible). This means our arrangement is in the form $$OO \hspace{3pt} EE \hspace{3pt} EO$$

### 解答

To get an odd sum, we have $1$ odd term and $2$ even terms ($3$ odd terms is impossible). This means our arrangement is in the form $$OO \hspace{3pt} EE \hspace{3pt} EO$$ There are $3 \cdot 3 \cdot 2 \cdot 2 \cdot 1 \cdot 1 = (3!)^2 = 36$ ways to directly assign the values to the blanks. There are $2$ ways to arrange the $EO$ term ($OE$ vs. $EO$). Then, there are $3!  = 6$ ways to arrange the groups around, yielding $72 \cdot 6 = 432$ total arrangements. Thus, the probability is $\dfrac{432}{6!} = \dfrac{3}{5}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/5"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "uiSXbNiymxLC7YlY62Do",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-7 13:57:38 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2505574,
    "source": "gabe",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Paired Values I",
    "topic": "probability",
    "urlEnding": "paired-values-i",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "uiSXbNiymxLC7YlY62Do",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Paired Values I",
    "topic": "probability",
    "urlEnding": "paired-values-i"
  }
}
```
