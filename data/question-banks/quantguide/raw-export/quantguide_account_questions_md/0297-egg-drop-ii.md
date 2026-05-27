# QuantGuide Question

## 297. Egg Drop II

**Metadata**

- ID: `E6cKA2h7irML6WKQ9xYl`
- URL: https://www.quantguide.io/questions/egg-drop-ii
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Aquatic Capital, Tower Research Capital, Optiver, TransMarket Group, Virtu Financial, WorldQuant, Akuna
- Source: og
- Tags: Games
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-11 09:52:04 America/New_York
- Last Edited By: Gabe

### 题干

You are holding three identical eggs in a really large building with $n$ stories. If an egg is dropped at an elevation under story $X$, then the egg will survive; else, the egg breaks. It is known that the egg will break at some floor number $1-n$. What is the maximum value of $n$ such that at most $9$ drops are required to determine $X$ in the worst-case scenario?


### Hint

In Egg Drop I, the strategy was to keep the worst case constant by scaling how high we jump at each interval based on how far up it is in our tower. In other words, make larger jumps at lower floors in the tower so that you can test every floor afterwards in a given range. Namely, with at most $d$ drops and $2$ eggs, you could test $\dfrac{d(d+1)}{2}$ floors completely. The key here is to note that when you drop one egg and it breaks, the problem is reduced down to the two egg case. Therefore, instead of making jumps that decrease linearly (which is what you do in the two egg case), make jumps that decrease by the maximum increment of the two egg case. 

### 解答

In Egg Drop I, the strategy was to keep the worst case constant by scaling how high we jump at each interval based on how far up it is in our tower. In other words, we make larger jumps at lower floors in the tower so that we can test every floor afterwards in a given range. Namely, with at most $d$ drops and $2$ eggs, we could test $\dfrac{d(d+1)}{2}$ floors completely. The key here is to note that when we drop one egg and it breaks, we really get reduced down to the two egg case. Therefore, instead of making jumps that decrease linearly (which is what we do in the two egg case), we are going to make jumps that decrease by the maximum increment of the two egg case. This is so that we are sufficiently able to search everything in a given range in the two egg case afterwards.

$$$$

Putting this into math, we want to find a first cutoff point such that if the egg breaks at floor $X$ on the first drop, we can examine the floors below it in $9-1 = 8$ trials. We can examine up to $\dfrac{8 \cdot 9}{2} = 36$ floors in $8$ trials by Egg Drop I, so we should drop our first egg at floor $37$. If it doesn't break, then we need to increment such that if it breaks on our next trial, we can examine the remaining space between $37$ and the next floor in $9-2 = 7$ drops. We can explore up to $\dfrac{8 \cdot 7}{2} = 28$ floors with $7$ drops, so we should place our next egg at floor $66$ such that we can explore floors $38-65$ ($28$ floors) in the remaining $7$ drops. 

$$$$

Continuing this pattern, when we have $k$ drops left, we are going to increment by $\dfrac{k(k+1)}{2} + 1$ floors. This means that the next egg after would be placed at floor $66 + 21 + 1 = 88$, the egg after at $88 + 15 + 1 = 104$, and so on. The remaining floors to drop eggs at would be $115, 122, 126,$ and $128$. If it breaks at $128$ but not at $126$, we try $127$ to verify the answer. If it doesn't break at $128$, we try $129$ instead and see if it breaks. If it breaks, we found our answer. If it doesn't break, then if $n = 130$, we would know that the egg breaks at floor $130$, as it must break on one of the floors in our building. We can't explore any higher than $130$ due to the fact that if it breaks at some point above $130$, we would have to search between $129$ and the breaking point, which takes strictly more than one egg drop. Therefore, $n =130$ is our answer.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "130"
    ],
    "companies": [
      {
        "company": "Aquatic Capital"
      },
      {
        "company": "Tower Research Capital"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "TransMarket Group"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "E6cKA2h7irML6WKQ9xYl",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-11 09:52:04 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2303797,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Egg Drop II",
    "topic": "brainteasers",
    "urlEnding": "egg-drop-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Aquatic Capital"
      },
      {
        "company": "Tower Research Capital"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "TransMarket Group"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "hard",
    "id": "E6cKA2h7irML6WKQ9xYl",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Egg Drop II",
    "topic": "brainteasers",
    "urlEnding": "egg-drop-ii"
  }
}
```
