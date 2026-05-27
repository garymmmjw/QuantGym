# QuantGuide Question

## 651. Circular Delete

**Metadata**

- ID: `bF5se2dPG2gq7Zh655aC`
- URL: https://www.quantguide.io/questions/circular-delete
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Citadel, Virtu Financial
- Source: citadel gd
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-4 23:02:22 America/New_York
- Last Edited By: Gabe

### 题干

The numbers $1,2,\dots, 2000$ are put on the circumference of a circle in clockwise increasing order. You start at the integer $1$ and delete it. Then you, move clockwise to $2$ and keep it. Afterwards, you are going to repeat in this fashion of alternating between deleting integers and keeping integers repeatedly until you reach the last integer of a given rotation. Afterwards, you start again by deleting the first integer in the new cycle, keeping the second, etc. Find the last integer to be deleted from the circle.

### Hint

At the first step, you are keeping all integers $n$ with $n \equiv 0 \hspace{3pt} \text{mod} \hspace{3pt} 2$. In the second step, what do you see happening?

### 解答

At the first step, you are keeping all integers $n$ with $n \equiv 0 \hspace{3pt} \text{mod} \hspace{3pt} 2$. Afterwards, you are keeping all integers with $n \equiv 0 \hspace{3pt} \text{mod} \hspace{3pt} 4$. More generally, at step $k$, you are keeping all integers $n \equiv 0 \hspace{3pt} \text{mod} \hspace{3pt} 2^k$. Therefore, we just need to find the largest $k$ such that $2^k \leq 2000$. $2^k$ will thus be our last integer. This is $k = 10$, which corresponds to $2^{10} = 1024$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1024"
    ],
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "bF5se2dPG2gq7Zh655aC",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 23:02:22 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5222521,
    "source": "citadel gd",
    "status": "published",
    "tags": [],
    "title": "Circular Delete",
    "topic": "brainteasers",
    "urlEnding": "circular-delete",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "medium",
    "id": "bF5se2dPG2gq7Zh655aC",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Circular Delete",
    "topic": "brainteasers",
    "urlEnding": "circular-delete"
  }
}
```
