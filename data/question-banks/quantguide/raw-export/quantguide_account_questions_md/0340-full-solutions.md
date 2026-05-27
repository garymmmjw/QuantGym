# QuantGuide Question

## 340. Full Solutions

**Metadata**

- ID: `jyqYm2vFv8WyawNszehY`
- URL: https://www.quantguide.io/questions/full-solutions
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 2
- Companies: IMC, WorldQuant, Goldman Sachs, Jane Street, DRW, Five Rings
- Source: multiple
- Tags: Pure Math
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-5 10:05:21 America/New_York
- Last Edited By: Gabe

### 题干

Find all pairs of integers $(x,y)$ such that $3x + 7y = 10000$. All of the solutions can be written in the form $x = a + 7n$ and $y = b - 3n$, where $n$ is any arbitrary integer and $a,b$ are integers such that $b$ is a minimal positive integer. Find $ab$. 

### Hint

Since $3$ and $7$ are relatively prime, there must exist a solution to this equation. Note that $3(-2) + 7(1) = 1$.

### 解答

Since $3$ and $7$ are clearly relatively prime, there must exist a solution to this equation. We note that $3(-2) + 7(1) = 1$, so if we multiply by $10000$ on both sides, $3(-20000) + 7(10000) = 10000$, which means $(x,y) = (-20000,10000)$ is a solution to this equation. By the latter hint, we can write all solutions to this equation in the form $$(-20000+7n,10000 - 3n)$$ We now need to reduce this equation so that the integer in front of $-3n$ is as small as possible. We note that $9999 = 3 \cdot 3333$, so we note that if $m = n-3333$, we can rewrite the form of solutions as $$(-20000 + 7(m + 3333), 10000 -3(m+3333)) = (3331 + 7m, 1-3m)$$ This is the general form where $b$ is as small as possible but possible. In particular $ab = 3331$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3331"
    ],
    "companies": [
      {
        "company": "IMC"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "jyqYm2vFv8WyawNszehY",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:05:21 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2598055,
    "source": "multiple",
    "status": "published",
    "tags": [
      {
        "tag": "Pure Math"
      }
    ],
    "title": "Full Solutions",
    "topic": "pure math",
    "urlEnding": "full-solutions",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "DRW"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "id": "jyqYm2vFv8WyawNszehY",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Pure Math"
      }
    ],
    "title": "Full Solutions",
    "topic": "pure math",
    "urlEnding": "full-solutions"
  }
}
```
