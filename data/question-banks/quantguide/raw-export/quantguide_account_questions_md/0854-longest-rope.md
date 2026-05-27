# QuantGuide Question

## 854. Longest Rope I

**Metadata**

- ID: `1KoSBNZhCV6XsJqwxqKd`
- URL: https://www.quantguide.io/questions/longest-rope
- Topic: statistics
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Two Sigma, Akuna, Citadel, Jane Street, Five Rings, Goldman Sachs
- Source: N/A
- Tags: Expected Value, Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-7 12:47:45 America/New_York
- Last Edited By: Gabe

### 题干

A rope that is one meter long is divided into three segments by two random points. What is the expected length of the longest segment?

### Hint

Graph shading is a powerful technique that will be useful for this problem. Start by writing your constraints. Because each segment is equally likely to be the longest, the expected length of the longest piece doesn't depend on which piece we choose, so you are solving for $E[X \vert X \textrm{ is the longest}]$.

### 解答

Let $X \in [0,1]$ be the location of the first cut and $Y \in [0,1]$ be the location of the second cut such that $X<Y$. Because each segment is equally likely to be the longest, the expected length of the longest piece doesn't depend on which piece we choose, so we can solve for $E[X \vert X \textrm{ is the longest}]$. This, with our earlier constraint of $X<Y$, gives us two additional constraints:

$$ X > Y-X \Rightarrow Y < 2X$$
$$ X > 1-Y \Rightarrow Y > 1-X$$

These two constraints derive from the fact that $X$ is given to be greater than the other two segments, $Y-X$ and $1-Y$. Graphing the constraints within our sample space, we see that the area satisfying our inequalities is the triangle A with vertices $(\frac{1}{2}, \frac{1}{2}), (\frac{1}{2},1)$, and $(\frac{1}{3}, \frac{2}{3})$, and triangle B with vertices $(\frac{1}{2}, \frac{1}{2}), (\frac{1}{2},1)$, and $(1, 1)$. We wish to find the probability of an outcome occurring in either areas and the expected value of X within each area.

$$\textrm{Area of A: }\frac{1}{2} \times \frac{1}{2} \times (\frac{1}{2} - \frac{1}{3}) = \frac{1}{24}$$
$$\textrm{Area of B: }\frac{1}{2} \times \frac{1}{2} \times \frac{1}{2} = \frac{1}{8} =\frac{3}{24} = 3 \times \textrm{Area of A}$$
$$\textrm{Expected value of X within A: } \frac{1}{2} - \frac{1}{3}(\frac{1}{2} - \frac{1}{3}) = \frac{4}{9}$$
$$\textrm{Expected value of X within B: } \frac{1}{2} + \frac{1}{3} \times \frac{1}{2} = \frac{2}{3}$$

The expected value of X within each triangle is calculated using the property of centroids. A centroid, or the center of area for a triangle, is $\frac{1}{3}$ of the way from the base to the opposite vertex, a property that is most easily seen by integration. Finally, we can solve for the expected value of X given X is the longest piece:

$$E[X \vert X \textrm{ is the longest}] = \frac{1}{4} \times \frac{4}{9} + \frac{3}{4} \times \frac{2}{3} = \frac{11}{18}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "11/18"
    ],
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "1KoSBNZhCV6XsJqwxqKd",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:47:45 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6967444,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Longest Rope I",
    "topic": "statistics",
    "urlEnding": "longest-rope",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "Goldman Sachs"
      }
    ],
    "difficulty": "hard",
    "id": "1KoSBNZhCV6XsJqwxqKd",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Longest Rope I",
    "topic": "statistics",
    "urlEnding": "longest-rope"
  }
}
```
